import type { AnthropicMessageRequest, AnthropicMessageResponse } from '../schemas/anthropic.js';
import type { OpenAIChatCompletionResponse } from '../schemas/openai.js';
import { adminStore } from '../admin-store.js';
import {
  convertToProviderRequest,
  convertFromProviderResponse,
  convertOpenAIStreamChunkToAnthropic,
} from '../adapters/request.js';
import { getLogger, getConfig } from '../config/index.js';
import { pricingService, calculateCost } from '../services/pricing.js';
import { createHeartbeatManager } from '../streaming/heartbeat.js';

export interface PipelineContext {
  requestId: string;
  startTime: number;
  anthropicRequest: AnthropicMessageRequest;
  tenantId?: string; // Format: "{orgId}:{teamId}" or "{orgId}" for org-only
  modelMapping?: {
    anthropicModel: string;
    providerId: string;
    providerModel: string;
  };
  provider?: {
    id: string;
    type: string;
    baseUrl: string;
    apiKey: string;
    timeout: number;
  };
  normalizedRequest?: unknown;
  providerRequest?: unknown;
  providerResponse?: unknown;
  anthropicResponse?: AnthropicMessageResponse;
  error?: string;
}

export interface PipelineOptions {
  requestId: string;
  enableLogging?: boolean;
  tenantId?: string; // Format: "{orgId}:{teamId}" or "{orgId}" for org-only
}

export async function processRequest(
  anthropicRequest: AnthropicMessageRequest,
  options: PipelineOptions
): Promise<AnthropicMessageResponse> {
  const context: PipelineContext = {
    requestId: options.requestId,
    startTime: Date.now(),
    anthropicRequest,
    tenantId: options.tenantId,
  };

  try {
    const modelMapping = adminStore.resolveModel(anthropicRequest.model);
    if (!modelMapping) {
      throw new Error(`No mapping found for model: ${anthropicRequest.model}`);
    }

    context.modelMapping = {
      anthropicModel: anthropicRequest.model,
      ...modelMapping,
    };

    const provider = adminStore.getProviderById(modelMapping.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${modelMapping.providerId}`);
    }

    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${modelMapping.providerId}`);
    }

    context.provider = {
      id: provider.id,
      type: provider.type,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      timeout: provider.timeoutMs,
    };

    const normalizedRequest = convertToProviderRequest(
      anthropicRequest,
      modelMapping.providerModel
    );
    context.normalizedRequest = normalizedRequest;

    const providerRequest = buildProviderRequest(normalizedRequest, provider);
    context.providerRequest = providerRequest;

    const providerResponse = await callProvider(providerRequest, {
      id: provider.id,
      apiKey: provider.apiKey,
      timeout: provider.timeoutMs,
    });
    context.providerResponse = providerResponse;

    const anthropicResponse = convertFromProviderResponse(
      providerResponse as OpenAIChatCompletionResponse,
      anthropicRequest.model
    );
    context.anthropicResponse = anthropicResponse;

    const latencyMs = Date.now() - context.startTime;

    const usage = providerResponse as OpenAIChatCompletionResponse;
    const inputTokens = usage.usage?.prompt_tokens ?? 0;
    const outputTokens = usage.usage?.completion_tokens ?? 0;
    const totalTokens = usage.usage?.total_tokens ?? 0;

    const providerPricing = pricingService.getPricing(modelMapping.providerModel);
    const cost = calculateCost({ inputTokens, outputTokens, totalTokens }, providerPricing);

    adminStore.addLog({
      id: context.requestId,
      timestamp: new Date().toISOString(),
      method: 'POST',
      url: '/v1/messages',
      statusCode: 200,
      model: anthropicRequest.model,
      provider: provider.id,
      latencyMs,
      status: 'success',
      inputTokens,
      outputTokens,
      totalTokens,
      inputCost: cost.inputCost,
      outputCost: cost.outputCost,
      totalCost: cost.totalCost,
      anthropicRequest,
      normalizedRequest,
      openaiRequest: providerRequest,
      providerResponse,
      anthropicResponse,
    });

    return anthropicResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    context.error = errorMessage;

    const latencyMs = Date.now() - context.startTime;
    adminStore.addLog({
      id: context.requestId,
      timestamp: new Date().toISOString(),
      method: 'POST',
      url: '/v1/messages',
      statusCode: 500,
      model: anthropicRequest.model,
      provider: context.provider?.id,
      latencyMs,
      status: 'error',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      anthropicRequest,
      error: errorMessage,
    });

    throw error;
  }
}

function buildProviderRequest(
  normalizedRequest: unknown,
  provider: {
    id: string;
    type: string;
    baseUrl: string;
  }
): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
} {
  const req = normalizedRequest as {
    model: string;
    messages: unknown[];
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stop?: string[];
    stream?: boolean;
    tools?: unknown[];
    tool_choice?: unknown;
    metadata?: Record<string, unknown>;
  };

  const { metadata: _metadata, ...rest } = req;
  const isStreaming = req.stream ?? false;
  const endpoint = isStreaming ? '/v1/chat/completions' : '/v1/chat/completions';

  return {
    url: `${provider.baseUrl}${endpoint}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      ...rest,
      stream: isStreaming,
    },
  };
}

async function callProvider(
  request: { url: string; method: string; headers: Record<string, string>; body: unknown },
  provider: { id: string; apiKey: string; timeout: number }
): Promise<unknown> {
  const logger = getLogger();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), provider.timeout);

  logger.info(
    {
      requestId: provider.id,
      url: request.url,
      method: request.method,
      hasApiKey: !!provider.apiKey,
      timeout: provider.timeout,
      body: request.body,
    },
    'Calling provider'
  );

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: {
        ...request.headers,
        ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
      },
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        {
          providerId: provider.id,
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
        },
        'Provider request failed'
      );
      throw new Error(
        `Provider request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    logger.info({ providerId: provider.id }, 'Provider request succeeded');
    return data;
  } catch (error) {
    clearTimeout(timeout);

    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      {
        providerId: provider.id,
        error: errorMessage,
        errorType: error?.constructor?.name,
      },
      'Provider request error'
    );

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${provider.timeout}ms`);
    }

    throw error;
  }
}

export async function processStreamingRequest(
  anthropicRequest: AnthropicMessageRequest,
  options: PipelineOptions,
  onChunk: (chunk: string) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> {
  const context: PipelineContext = {
    requestId: options.requestId,
    startTime: Date.now(),
    anthropicRequest,
    tenantId: options.tenantId,
  };

  let streamEnded = false;
  const handleError = (error: Error) => {
    if (streamEnded) return;
    streamEnded = true;
    onError(error);
  };
  const handleComplete = () => {
    if (streamEnded) return;
    streamEnded = true;
    onComplete();
  };

  try {
    const modelMapping = adminStore.resolveModel(anthropicRequest.model);
    if (!modelMapping) {
      throw new Error(`No mapping found for model: ${anthropicRequest.model}`);
    }

    context.modelMapping = {
      anthropicModel: anthropicRequest.model,
      ...modelMapping,
    };

    const provider = adminStore.getProviderById(modelMapping.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${modelMapping.providerId}`);
    }

    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${modelMapping.providerId}`);
    }

    context.provider = {
      id: provider.id,
      type: provider.type,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      timeout: provider.timeoutMs,
    };

    const normalizedRequest = convertToProviderRequest(
      anthropicRequest,
      modelMapping.providerModel
    );
    context.normalizedRequest = normalizedRequest;

    const providerRequest = buildProviderRequest({ ...normalizedRequest, stream: true }, provider);
    context.providerRequest = providerRequest;

    const messageId = `msg_${context.requestId}`;

    await streamFromProvider(
      providerRequest,
      {
        apiKey: provider.apiKey,
        timeout: provider.timeoutMs,
        heartbeatIntervalMs: provider.heartbeatIntervalMs,
      },
      onChunk,
      handleError,
      messageId,
      modelMapping.providerModel
    );

    const latencyMs = Date.now() - context.startTime;
    adminStore.addLog({
      id: context.requestId,
      timestamp: new Date().toISOString(),
      method: 'POST',
      url: '/v1/messages/stream',
      statusCode: 200,
      model: anthropicRequest.model,
      provider: provider.id,
      latencyMs,
      status: 'success',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      anthropicRequest,
      normalizedRequest,
      openaiRequest: providerRequest,
    });

    handleComplete();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    context.error = errorMessage;

    const latencyMs = Date.now() - context.startTime;
    adminStore.addLog({
      id: context.requestId,
      timestamp: new Date().toISOString(),
      method: 'POST',
      url: '/v1/messages/stream',
      statusCode: 500,
      model: anthropicRequest.model,
      provider: context.provider?.id,
      latencyMs,
      status: 'error',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      anthropicRequest,
      error: errorMessage,
    });

    handleError(error instanceof Error ? error : new Error(errorMessage));
  }
}

async function streamFromProvider(
  request: { url: string; method: string; headers: Record<string, string>; body: unknown },
  provider: { apiKey: string; timeout: number; heartbeatIntervalMs?: number },
  onChunk: (chunk: string) => void,
  onError: (error: Error) => void,
  messageId?: string,
  model?: string
): Promise<void> {
  const logger = getLogger();
  const config = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), provider.timeout);

  const msgId = messageId ?? `msg_${Date.now()}`;

  // Get heartbeat interval from provider config or global default
  const heartbeatMs =
    provider.heartbeatIntervalMs ?? config.streaming?.heartbeatIntervalMs ?? 10000;

  // Create heartbeat manager
  const heartbeatManager = createHeartbeatManager({
    intervalMs: heartbeatMs,
    onHeartbeat: () => {
      // Send SSE comment - invisible to client, keeps connection alive
      const heartbeatChunk = ': heartbeat\n\n';
      onChunk(heartbeatChunk);
    },
  });

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: {
        ...request.headers,
        ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
      },
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Provider request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    // Start heartbeat after response is received
    heartbeatManager.start();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Notify heartbeat manager that data was sent
      heartbeatManager.notifyDataSent();

      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const anthropicChunk = convertOpenAIStreamChunkToAnthropic(
            line,
            msgId,
            model ?? 'unknown'
          );
          if (anthropicChunk) {
            onChunk(anthropicChunk);
          }
        }
      }
    }

    // Stop heartbeat when stream completes
    heartbeatManager.stop();
  } catch (error) {
    clearTimeout(timeout);
    // Stop heartbeat on error
    heartbeatManager.stop();

    if (error instanceof Error && error.name === 'AbortError') {
      onError(new Error(`Request timeout after ${provider.timeout}ms`));
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'Stream error');
    onError(error instanceof Error ? error : new Error(errorMessage));
    return;
  }
}

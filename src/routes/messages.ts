import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { RequestWithId } from './index.js';
import { AnthropicMessageRequestSchema } from '../schemas/anthropic.js';
import { toJsonSchema } from '../schemas/index.js';
import type { AnthropicMessageRequest } from '../schemas/anthropic.js';
import { classifyError } from '../providers/errors.js';
import { processRequest, processStreamingRequest } from '../core/pipeline.js';
import { getConfig } from '../config/index.js';
import { tenancyService } from '../services/tenancy/index.js';

/**
 * Extracts tenant context from API key validation.
 * Returns undefined for test mode or when multi-tenancy is not configured.
 * Format: "{orgId}:{teamId}" or "{orgId}" for org-only.
 */
async function extractTenantContext(
  effectiveKey: string | undefined,
  config: ReturnType<typeof getConfig>
): Promise<string | undefined> {
  // Skip tenant extraction for test mode or missing key
  if (!effectiveKey || effectiveKey === 'test') {
    return undefined;
  }

  // If a primary API key is configured and matches, no multi-tenancy
  if (config.providers.primary.apiKey && effectiveKey === config.providers.primary.apiKey) {
    return undefined;
  }

  // Try to validate via TenancyService for multi-tenant scenarios
  // This is only reached when neither test nor primary key match
  // (i.e., when a tenant-specific API key is provided)
  try {
    const validation = await tenancyService.validateApiKey(effectiveKey);
    if (validation.valid && validation.organization) {
      // Build tenant ID from org and team
      return validation.team
        ? `${validation.organization.id}:${validation.team.id}`
        : validation.organization.id;
    }
  } catch {
    // TenancyService not available or error - continue without tenant
  }

  return undefined;
}

async function handleStreamingRequest(
  request: FastifyRequest<{ Body: AnthropicMessageRequest }>,
  reply: FastifyReply,
  validatedRequest: AnthropicMessageRequest,
  logger: {
    debug: (obj: unknown, msg: string) => void;
    error: (obj: unknown, msg: string) => void;
  },
  req: RequestWithId,
  config: ReturnType<typeof getConfig>,
  tenantId?: string
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined;
  const authHeader = request.headers.authorization as string | undefined;
  const authToken = request.headers['anthropic-auth-token'] as string | undefined;

  // Allow test token or skip auth validation if no API key is configured
  const effectiveKey = authToken || apiKey || authHeader?.replace('Bearer ', '');

  if (config.providers.primary.apiKey) {
    const validKey = config.providers.primary.apiKey;
    // Allow test token for development, or if key matches
    if (effectiveKey !== 'test' && effectiveKey !== validKey) {
      return reply.status(401).send({
        type: 'error',
        error: {
          type: 'authentication_error',
          message: 'Invalid API key',
        },
      });
    }
  }

  logger.debug(
    {
      requestId: req.id,
      model: validatedRequest.model,
    },
    'Processing streaming message request (auto-detected)'
  );

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Request-ID': req.id,
    'X-Accel-Buffering': 'no',
  });

  const messageId = `msg_${req.id}`;

  reply.raw.write(
    `event: message_start\ndata: ${JSON.stringify({
      type: 'message_start',
      message: {
        id: messageId,
        type: 'message',
        role: 'assistant',
        content: [],
        model: validatedRequest.model,
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    })}\n\n`
  );

  reply.raw.write(
    `event: content_block_start\ndata: ${JSON.stringify({
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text' },
    })}\n\n`
  );

  const callbacks = {
    onChunk: (chunk: string) => {
      if (reply.raw.writable) {
        reply.raw.write(chunk);
      }
    },
    onError: (error: Error) => {
      logger.error(
        {
          requestId: req.id,
          error: error.message,
        },
        'Streaming request error'
      );

      if (reply.raw.writable) {
        reply.raw.write(
          `event: error\ndata: ${JSON.stringify({
            type: 'error',
            error: {
              type: 'internal_error',
              message: error.message,
            },
          })}\n\n`
        );
        reply.raw.end();
      }
    },
    onComplete: () => {
      logger.debug(
        {
          requestId: req.id,
        },
        'Streaming message request completed'
      );

      if (reply.raw.writable) {
        reply.raw.write(
          `event: content_block_stop\ndata: ${JSON.stringify({
            type: 'content_block_stop',
            index: 0,
          })}\n\n`
        );
        reply.raw.write('event: message_stop\ndata: {}\n\n');
        reply.raw.end();
      }
    },
  };

  try {
    await processStreamingRequest(
      validatedRequest,
      { requestId: req.id, tenantId },
      callbacks.onChunk,
      callbacks.onError,
      callbacks.onComplete
    );
  } catch (error) {
    const providerError = classifyError(error, 'bridge');

    logger.error(
      {
        requestId: req.id,
        error: providerError.message,
      },
      'Streaming request failed'
    );

    reply.raw.write(
      `event: error\ndata: ${JSON.stringify({
        type: 'error',
        error: {
          type: providerError.type,
          message: providerError.message,
        },
      })}\n\n`
    );
    reply.raw.end();
  }
}

export async function messagesRouter(fastify: FastifyInstance): Promise<void> {
  const bodySchema = toJsonSchema(AnthropicMessageRequestSchema);

  fastify.post<{
    Body: AnthropicMessageRequest;
  }>(
    '/messages',
    {
      schema: {
        body: bodySchema,
      },
    },
    async (request: FastifyRequest<{ Body: AnthropicMessageRequest }>, reply: FastifyReply) => {
      const config = getConfig();
      const req = request as RequestWithId;
      const logger = req.server?.log ?? console;

      const apiKey = request.headers['x-api-key'] as string | undefined;
      const authHeader = request.headers.authorization as string | undefined;
      const authToken = request.headers['anthropic-auth-token'] as string | undefined;
      const anthropicVersion = request.headers['anthropic-version'] as string | undefined;

      const effectiveKey = authToken || apiKey || authHeader?.replace('Bearer ', '');

      if (!anthropicVersion) {
        return reply.status(400).send({
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message: 'Missing required header: anthropic-version',
          },
        });
      }

      if (config.providers.primary.apiKey) {
        const validKey = config.providers.primary.apiKey;
        if (effectiveKey !== 'test' && effectiveKey !== validKey) {
          return reply.status(401).send({
            type: 'error',
            error: {
              type: 'authentication_error',
              message: 'Invalid API key',
            },
          });
        }
      }

      // Extract tenant context for multi-tenant scenarios
      const tenantId = await extractTenantContext(effectiveKey, config);

      const validationResult = AnthropicMessageRequestSchema.safeParse(request.body);
      if (!validationResult.success) {
        logger.warn(
          {
            requestId: req.id,
            errors: validationResult.error.errors,
          },
          'Invalid request body'
        );

        return reply.status(400).send({
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message: 'Invalid request body',
            param: undefined,
          },
        });
      }

      const validatedRequest = validationResult.data as AnthropicMessageRequest;

      if (validatedRequest.stream) {
        return handleStreamingRequest(
          request,
          reply,
          validatedRequest,
          logger,
          req,
          config,
          tenantId
        );
      }

      logger.debug(
        {
          requestId: req.id,
          model: validatedRequest.model,
          hasTools: !!validatedRequest.tools,
          hasSystem: !!validatedRequest.system,
        },
        'Processing message request'
      );

      try {
        const response = await processRequest(validatedRequest, { requestId: req.id, tenantId });

        logger.debug(
          {
            requestId: req.id,
            responseId: response.id,
            stopReason: response.stop_reason,
          },
          'Message request completed'
        );

        return reply.send(response);
      } catch (error) {
        const providerError = classifyError(error, 'bridge');

        logger.error(
          {
            requestId: req.id,
            error: providerError.message,
            type: providerError.type,
            statusCode: providerError.statusCode,
          },
          'Message request failed'
        );

        const statusCode = providerError.statusCode ?? 500;

        return reply.status(statusCode).send({
          type: 'error',
          error: {
            type: providerError.type,
            message: providerError.message,
            param: providerError.param ?? undefined,
          },
        });
      }
    }
  );

  fastify.post<{
    Body: AnthropicMessageRequest;
  }>(
    '/messages/stream',
    {
      schema: {
        body: bodySchema,
      },
    },
    async (request: FastifyRequest<{ Body: AnthropicMessageRequest }>, reply: FastifyReply) => {
      const config = getConfig();
      const req = request as RequestWithId;
      const logger = req.server?.log ?? console;

      const apiKey = request.headers['x-api-key'] as string | undefined;
      const authHeader = request.headers.authorization as string | undefined;
      const authToken = request.headers['anthropic-auth-token'] as string | undefined;
      const anthropicVersion = request.headers['anthropic-version'] as string | undefined;

      const effectiveKey = authToken || apiKey || authHeader?.replace('Bearer ', '');

      if (!anthropicVersion) {
        return reply.status(400).send({
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message: 'Missing required header: anthropic-version',
          },
        });
      }

      if (config.providers.primary.apiKey) {
        const validKey = config.providers.primary.apiKey;
        if (effectiveKey !== 'test' && effectiveKey !== validKey) {
          return reply.status(401).send({
            type: 'error',
            error: {
              type: 'authentication_error',
              message: 'Invalid API key',
            },
          });
        }
      }

      // Extract tenant context for multi-tenant scenarios
      const tenantId = await extractTenantContext(effectiveKey, config);

      const validationResult = AnthropicMessageRequestSchema.safeParse(request.body);
      if (!validationResult.success) {
        logger.warn(
          {
            requestId: req.id,
            errors: validationResult.error.errors,
          },
          'Invalid streaming request body'
        );

        return reply.status(400).send({
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message: 'Invalid request body',
          },
        });
      }

      const validatedRequest = validationResult.data as AnthropicMessageRequest;

      logger.debug(
        {
          requestId: req.id,
          model: validatedRequest.model,
        },
        'Processing streaming message request'
      );

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Request-ID': req.id,
        'X-Accel-Buffering': 'no',
      });

      const messageId = `msg_${req.id}`;

      reply.raw.write(
        `event: message_start\ndata: ${JSON.stringify({
          type: 'message_start',
          message: {
            id: messageId,
            type: 'message',
            role: 'assistant',
            content: [],
            model: validatedRequest.model,
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: 0, output_tokens: 0 },
          },
        })}\n\n`
      );

      reply.raw.write(
        `event: content_block_start\ndata: ${JSON.stringify({
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text' },
        })}\n\n`
      );

      const callbacks = {
        onChunk: (chunk: string) => {
          if (reply.raw.writable) {
            reply.raw.write(chunk);
          }
        },
        onError: (error: Error) => {
          logger.error(
            {
              requestId: req.id,
              error: error.message,
            },
            'Streaming request error'
          );

          if (reply.raw.writable) {
            reply.raw.write(
              `event: error\ndata: ${JSON.stringify({
                type: 'error',
                error: {
                  type: 'internal_error',
                  message: error.message,
                },
              })}\n\n`
            );
            reply.raw.end();
          }
        },
        onComplete: () => {
          logger.debug(
            {
              requestId: req.id,
            },
            'Streaming message request completed'
          );

          if (reply.raw.writable) {
            reply.raw.write(
              `event: content_block_stop\ndata: ${JSON.stringify({
                type: 'content_block_stop',
                index: 0,
              })}\n\n`
            );
            reply.raw.write('event: message_stop\ndata: {}\n\n');
            reply.raw.end();
          }
        },
      };

      try {
        await processStreamingRequest(
          validatedRequest,
          { requestId: req.id, tenantId },
          callbacks.onChunk,
          callbacks.onError,
          callbacks.onComplete
        );
      } catch (error) {
        const providerError = classifyError(error, 'bridge');

        logger.error(
          {
            requestId: req.id,
            error: providerError.message,
          },
          'Streaming request failed'
        );

        reply.raw.write(
          `event: error\ndata: ${JSON.stringify({
            type: 'error',
            error: {
              type: providerError.type,
              message: providerError.message,
            },
          })}\n\n`
        );
        reply.raw.end();
      }
    }
  );
}

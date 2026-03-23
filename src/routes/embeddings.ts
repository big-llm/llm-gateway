import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OpenAIEmbeddingRequestSchema } from '../schemas/openai.js';
import { providerRegistry } from '../services/index.js';
import { cacheService } from '../services/cache.js';
import { generateRequestId } from '../utils/id.js';
import { adminStore } from '../admin-store.js';

export async function embeddingsRouter(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: unknown }>(
    '/embeddings',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const requestId = (request.headers['x-request-id'] as string) || generateRequestId();
      const startTime = Date.now();

      const parseResult = OpenAIEmbeddingRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            message: parseResult.error.errors.map((e) => e.message).join(', '),
            type: 'invalid_request_error',
          },
        });
      }

      const { model, input, dimensions, encoding_format } = parseResult.data;

      const cacheKey = cacheService.generateKey(
        'embedding',
        model,
        Array.isArray(input) ? input.join('\n') : input,
        String(dimensions)
      );

      const cached = await cacheService.get(cacheKey, '');
      if (cached) {
        return reply.status(200).send(cached);
      }

      const mapping = adminStore.resolveModel(model);
      const providerId = mapping?.providerId || 'primary';
      const provider = providerRegistry.getById(providerId);

      if (!provider) {
        return reply.status(500).send({
          error: {
            message: 'No provider available',
            type: 'internal_error',
          },
        });
      }

      try {
        const url = `${provider.baseUrl}/v1/embeddings`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: mapping?.providerModel || model,
            input,
            dimensions,
            encoding_format: encoding_format || 'float',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Embedding request failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        await cacheService.set(cacheKey, result, '', { ttl: 300000 });

        const duration = Date.now() - startTime;

        adminStore.addLog({
          id: requestId,
          timestamp: new Date().toISOString(),
          method: 'POST',
          url: '/v1/embeddings',
          statusCode: 200,
          model,
          provider: providerId,
          latencyMs: duration,
          status: 'success',
        });

        return reply.status(200).send(result);
      } catch (error) {
        const duration = Date.now() - startTime;
        const message = error instanceof Error ? error.message : 'Unknown error';

        adminStore.addLog({
          id: requestId,
          timestamp: new Date().toISOString(),
          method: 'POST',
          url: '/v1/embeddings',
          statusCode: 500,
          model,
          provider: providerId,
          latencyMs: duration,
          status: 'error',
          error: message,
        });

        return reply.status(500).send({
          error: {
            message,
            type: 'internal_error',
          },
        });
      }
    }
  );
}

import { z } from 'zod';

export const providerConfigSchema = z.object({
  type: z.enum(['openai-compatible', 'anthropic', 'openai']).optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  timeout: z.number().optional(),
  maxRetries: z.number().optional(),
  heartbeatIntervalMs: z.number().int().positive().optional(),
});

const modelMappingSchema = z.record(z.string(), z.string());

export const configSchema = z.object({
  server: z.object({
    host: z.string().default('0.0.0.0'),
    port: z.number().int().positive().default(3000),
    requestTimeout: z.number().optional(),
  }),
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    pretty: z.boolean().default(false),
  }),
  database: z.object({
    url: z.string().optional(),
    type: z.enum(['sqlite', 'postgresql']).default('sqlite'),
    poolSize: z.number().optional(),
  }),
  redis: z.object({
    url: z.string().optional(),
    enabled: z.boolean().default(true),
    keyPrefix: z.string().default('llm-gateway'),
    keyTtl: z.number().default(300),
  }),
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    max: z.number().int().positive().default(100),
    timeWindow: z.string().default('1 minute'),
  }),
  cors: z.object({
    enabled: z.boolean().default(true),
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
  }),
  providers: z.object({
    primary: providerConfigSchema,
    fallback: providerConfigSchema.optional(),
  }),
  modelMapping: modelMappingSchema.default({}),
  router: z.object({
    strategy: z.enum(['round-robin', 'weighted', 'failover']).default('failover'),
    healthCheckInterval: z.number().optional(),
    circuitBreaker: z.object({
      enabled: z.boolean().default(true),
      threshold: z.number().optional(),
      timeout: z.number().optional(),
    }),
  }),
  admin: z
    .object({
      token: z.string().optional(),
      logBufferSize: z.number().optional(),
      healthCheckIntervalMs: z.number().optional(),
    })
    .optional(),
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().default(3600),
    prefix: z.string().default('llm-cache'),
  }),
  streaming: z
    .object({
      heartbeatIntervalMs: z.number().int().positive().default(10000),
    })
    .default({ heartbeatIntervalMs: 10000 }),
});

export type Config = z.infer<typeof configSchema>;
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type ModelMapping = z.infer<typeof modelMappingSchema>;

export const DEFAULT_MODEL_MAPPING: ModelMapping = {
  'claude-3-5-sonnet-20240620': 'meta/llama-3.1-70b-instruct',
  'claude-3-opus-20240229': 'meta/llama-3.1-405b-instruct',
  'claude-3-haiku-20240307': 'meta/llama-3.1-8b-instruct',
  'claude-sonnet-4-20250514': 'meta/llama-3.3-70b-instruct',
};

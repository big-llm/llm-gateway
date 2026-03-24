import { readFileSync } from 'fs';
import { resolve } from 'path';
import pino from 'pino';
import { configSchema, DEFAULT_MODEL_MAPPING, type Config } from './schema.js';

let config: Config | null = null;
let logger: pino.Logger | null = null;
let loggerPromise: Promise<pino.Logger> | null = null;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  if (config) return config;

  const configFromEnv: Partial<Config> = {
    server: {
      host: env.SERVER_HOST ?? '0.0.0.0',
      port: parseInt(env.SERVER_PORT ?? '3000', 10),
      requestTimeout: env.REQUEST_TIMEOUT ? parseInt(env.REQUEST_TIMEOUT, 10) : undefined,
    },
    logging: {
      level: (env.LOG_LEVEL as Config['logging']['level']) ?? 'info',
      pretty: env.LOG_PRETTY === 'true',
    },
    rateLimit: {
      enabled: env.RATE_LIMIT_ENABLED !== 'false',
      max: parseInt(env.RATE_LIMIT_MAX ?? '100', 10),
      timeWindow: env.RATE_LIMIT_TIME_WINDOW ?? '1 minute',
    },
    cors: {
      enabled: env.CORS_ENABLED !== 'false',
      origin: env.CORS_ORIGIN ?? '*',
    },
    providers: {
      primary: {
        type: 'openai',
        apiKey: env.PRIMARY_API_KEY,
        baseUrl: env.PRIMARY_BASE_URL,
        model: env.PRIMARY_MODEL,
        timeout: env.PRIMARY_TIMEOUT ? parseInt(env.PRIMARY_TIMEOUT, 10) : undefined,
        maxRetries: env.PRIMARY_MAX_RETRIES ? parseInt(env.PRIMARY_MAX_RETRIES, 10) : undefined,
      },
      fallback: env.FALLBACK_API_KEY
        ? {
            type: 'anthropic',
            apiKey: env.FALLBACK_API_KEY,
            baseUrl: env.FALLBACK_BASE_URL,
            model: env.FALLBACK_MODEL,
            timeout: env.FALLBACK_TIMEOUT ? parseInt(env.FALLBACK_TIMEOUT, 10) : undefined,
            maxRetries: env.FALLBACK_MAX_RETRIES
              ? parseInt(env.FALLBACK_MAX_RETRIES, 10)
              : undefined,
          }
        : undefined,
    },
    router: {
      strategy: (env.ROUTER_STRATEGY as Config['router']['strategy']) ?? 'failover',
      healthCheckInterval: env.HEALTH_CHECK_INTERVAL
        ? parseInt(env.HEALTH_CHECK_INTERVAL, 10)
        : undefined,
      circuitBreaker: {
        enabled: env.CIRCUIT_BREAKER_ENABLED !== 'false',
        threshold: env.CIRCUIT_BREAKER_THRESHOLD
          ? parseInt(env.CIRCUIT_BREAKER_THRESHOLD, 10)
          : undefined,
        timeout: env.CIRCUIT_BREAKER_TIMEOUT
          ? parseInt(env.CIRCUIT_BREAKER_TIMEOUT, 10)
          : undefined,
      },
    },
    admin: env.ADMIN_TOKEN
      ? {
          token: env.ADMIN_TOKEN,
          logBufferSize: env.ADMIN_LOG_BUFFER_SIZE
            ? parseInt(env.ADMIN_LOG_BUFFER_SIZE, 10)
            : undefined,
          healthCheckIntervalMs: env.PROVIDER_HEALTH_INTERVAL_MS
            ? parseInt(env.PROVIDER_HEALTH_INTERVAL_MS, 10)
            : undefined,
        }
      : undefined,
    database: {
      url: env.DATABASE_URL,
      type: (env.DATABASE_TYPE as Config['database']['type']) ?? 'sqlite',
      poolSize: env.DATABASE_POOL_SIZE ? parseInt(env.DATABASE_POOL_SIZE, 10) : undefined,
    },
    redis: {
      url: env.REDIS_URL,
      enabled: env.REDIS_ENABLED !== 'false',
      keyPrefix: env.REDIS_KEY_PREFIX ?? 'llm-gateway',
      keyTtl: env.REDIS_KEY_TTL ? parseInt(env.REDIS_KEY_TTL, 10) : 300,
    },
    cache: {
      enabled: env.CACHE_ENABLED !== 'false',
      ttl: env.CACHE_TTL ? parseInt(env.CACHE_TTL, 10) : 3600,
      prefix: env.CACHE_PREFIX ?? 'llm-cache',
    },
    streaming: {
      heartbeatIntervalMs: env.SSE_HEARTBEAT_INTERVAL_MS
        ? parseInt(env.SSE_HEARTBEAT_INTERVAL_MS, 10)
        : 10000,
    },
  };

  const parsedConfig = configSchema.parse(configFromEnv);
  config = parsedConfig;
  return parsedConfig;
}

export function getConfig(): Config {
  if (!config) {
    return loadConfig();
  }
  return config;
}

export function initLogger(): Promise<pino.Logger> {
  if (logger) return Promise.resolve(logger);

  if (loggerPromise) {
    return loggerPromise;
  }

  loggerPromise = (async () => {
    const cfg = getConfig();

    logger = pino({
      level: cfg.logging.level,
      transport: cfg.logging.pretty
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    });

    loggerPromise = null;
    return logger;
  })();

  return loggerPromise;
}

export function getLogger(): pino.Logger {
  if (!logger) {
    initLogger();
  }
  return logger as pino.Logger;
}

export function loadConfigFromFile(filePath: string): Config {
  try {
    const fileContent = readFileSync(resolve(filePath), 'utf-8');
    const parsed = JSON.parse(fileContent);
    const mergedConfig = {
      ...parsed,
      modelMapping: { ...DEFAULT_MODEL_MAPPING, ...parsed.modelMapping },
    };
    config = configSchema.parse(mergedConfig);
    return config;
  } catch (error) {
    throw new Error(`Failed to load config from ${filePath}: ${error}`);
  }
}

export function resetConfig(): void {
  config = null;
  logger = null;
  loggerPromise = null;
}

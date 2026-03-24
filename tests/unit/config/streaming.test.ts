import { describe, it, expect, beforeEach } from 'vitest';
import { providerConfigSchema, configSchema } from '../../../src/config/schema.js';

describe('ProviderConfig schema - heartbeatIntervalMs', () => {
  it('should accept heartbeatIntervalMs as optional number', () => {
    const result = providerConfigSchema.safeParse({
      type: 'openai',
      apiKey: 'test-key',
      heartbeatIntervalMs: 15000,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.heartbeatIntervalMs).toBe(15000);
    }
  });

  it('should work without heartbeatIntervalMs (optional)', () => {
    const result = providerConfigSchema.safeParse({
      type: 'openai',
      apiKey: 'test-key',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.heartbeatIntervalMs).toBeUndefined();
    }
  });

  it('should reject negative heartbeatIntervalMs', () => {
    const result = providerConfigSchema.safeParse({
      type: 'openai',
      apiKey: 'test-key',
      heartbeatIntervalMs: -1000,
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-integer heartbeatIntervalMs', () => {
    const result = providerConfigSchema.safeParse({
      type: 'openai',
      apiKey: 'test-key',
      heartbeatIntervalMs: 10.5,
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-number heartbeatIntervalMs', () => {
    const result = providerConfigSchema.safeParse({
      type: 'openai',
      apiKey: 'test-key',
      heartbeatIntervalMs: '10000',
    });

    expect(result.success).toBe(false);
  });

  it('should accept valid positive integer heartbeatIntervalMs', () => {
    const result = providerConfigSchema.safeParse({
      type: 'openai',
      apiKey: 'test-key',
      heartbeatIntervalMs: 5000,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.heartbeatIntervalMs).toBe(5000);
    }
  });
});

describe('Config schema - streaming.heartbeatIntervalMs', () => {
  it('should accept config with streaming.heartbeatIntervalMs', () => {
    const result = configSchema.safeParse({
      server: { host: '0.0.0.0', port: 3000 },
      logging: { level: 'info', pretty: false },
      database: { type: 'sqlite' },
      redis: { enabled: true },
      rateLimit: { enabled: true, max: 100, timeWindow: '1 minute' },
      cors: { enabled: true, origin: '*' },
      providers: {
        primary: { type: 'openai', apiKey: 'test-key' },
      },
      router: { strategy: 'failover', circuitBreaker: { enabled: true } },
      cache: { enabled: true, ttl: 3600, prefix: 'llm-cache' },
      streaming: { heartbeatIntervalMs: 10000 },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.streaming?.heartbeatIntervalMs).toBe(10000);
    }
  });

  it('should use default heartbeatIntervalMs when not provided', () => {
    const result = configSchema.safeParse({
      server: { host: '0.0.0.0', port: 3000 },
      logging: { level: 'info', pretty: false },
      database: { type: 'sqlite' },
      redis: { enabled: true },
      rateLimit: { enabled: true, max: 100, timeWindow: '1 minute' },
      cors: { enabled: true, origin: '*' },
      providers: {
        primary: { type: 'openai', apiKey: 'test-key' },
      },
      router: { strategy: 'failover', circuitBreaker: { enabled: true } },
      cache: { enabled: true, ttl: 3600, prefix: 'llm-cache' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.streaming?.heartbeatIntervalMs).toBe(10000);
    }
  });

  it('should reject invalid streaming.heartbeatIntervalMs', () => {
    const result = configSchema.safeParse({
      server: { host: '0.0.0.0', port: 3000 },
      logging: { level: 'info', pretty: false },
      database: { type: 'sqlite' },
      redis: { enabled: true },
      rateLimit: { enabled: true, max: 100, timeWindow: '1 minute' },
      cors: { enabled: true, origin: '*' },
      providers: {
        primary: { type: 'openai', apiKey: 'test-key' },
      },
      router: { strategy: 'failover', circuitBreaker: { enabled: true } },
      cache: { enabled: true, ttl: 3600, prefix: 'llm-cache' },
      streaming: { heartbeatIntervalMs: -5000 },
    });

    expect(result.success).toBe(false);
  });
});

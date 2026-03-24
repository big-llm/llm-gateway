import { z } from 'zod';

export const ProviderSchema = z.object({
  id: z.string(),
  type: z.enum(['openai-compatible', 'anthropic-compatible']),
  baseUrl: z.string(),
  apiKey: z.string(),
  models: z.array(z.string()),
  timeoutMs: z.number().default(60000),
  enabled: z.boolean().default(true),
  priority: z.number().default(0),
  heartbeatIntervalMs: z.number().int().positive().optional(),
});

export type Provider = z.infer<typeof ProviderSchema>;

export interface ProviderStatus {
  id: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number | null;
  lastCheck: string | null;
  successCount: number;
  errorCount: number;
  totalCount: number;
}

class ProviderRegistry {
  private providers: Map<string, Provider> = new Map();
  private providerStatus: Map<string, ProviderStatus> = new Map();

  constructor() {
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    const defaultProviders: Provider[] = [
      {
        id: 'nim',
        type: 'openai-compatible',
        baseUrl: process.env.PRIMARY_BASE_URL || 'https://integrate.api.nvidia.com/v1',
        apiKey: process.env.PRIMARY_API_KEY || '',
        models: process.env.PRIMARY_MODEL
          ? [process.env.PRIMARY_MODEL]
          : ['meta/llama-3.1-70b-instruct', 'meta/llama-3.1-nemotron-70b-instruct'],
        timeoutMs: process.env.PRIMARY_TIMEOUT ? parseInt(process.env.PRIMARY_TIMEOUT, 10) : 60000,
        enabled: true,
        priority: 10,
      },
    ];

    for (const provider of defaultProviders) {
      this.providers.set(provider.id, provider);
      this.providerStatus.set(provider.id, {
        id: provider.id,
        status: 'unhealthy',
        latencyMs: null,
        lastCheck: null,
        successCount: 0,
        errorCount: 0,
        totalCount: 0,
      });
    }
  }

  getAll(): Provider[] {
    return Array.from(this.providers.values());
  }

  getById(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  getEnabled(): Provider[] {
    return this.getAll()
      .filter((p) => p.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  add(provider: Provider): Provider {
    this.providers.set(provider.id, provider);
    this.providerStatus.set(provider.id, {
      id: provider.id,
      status: 'unhealthy',
      latencyMs: null,
      lastCheck: null,
      successCount: 0,
      errorCount: 0,
      totalCount: 0,
    });
    return provider;
  }

  update(id: string, updates: Partial<Provider>): Provider | undefined {
    const existing = this.providers.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.providers.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    const existed = this.providers.delete(id);
    if (existed) {
      this.providerStatus.delete(id);
    }
    return existed;
  }

  getStatus(id: string): ProviderStatus | undefined {
    return this.providerStatus.get(id);
  }

  getAllStatus(): ProviderStatus[] {
    return Array.from(this.providerStatus.values());
  }

  updateStatus(id: string, status: Partial<ProviderStatus>): void {
    const existing = this.providerStatus.get(id);
    if (existing) {
      this.providerStatus.set(id, { ...existing, ...status });
    }
  }

  recordSuccess(id: string): void {
    const status = this.providerStatus.get(id);
    if (status) {
      this.providerStatus.set(id, {
        ...status,
        successCount: status.successCount + 1,
        totalCount: status.totalCount + 1,
      });
    }
  }

  recordError(id: string): void {
    const status = this.providerStatus.get(id);
    if (status) {
      this.providerStatus.set(id, {
        ...status,
        errorCount: status.errorCount + 1,
        totalCount: status.totalCount + 1,
      });
    }
  }

  setConfig(config: {
    primary?: { apiKey?: string; baseUrl?: string; model?: string };
    fallback?: { apiKey?: string; baseUrl?: string; model?: string };
  }): void {
    if (config.primary) {
      const existing = this.providers.get('primary');
      if (existing) {
        this.update('primary', {
          ...config.primary,
          type: 'openai-compatible',
          models: config.primary.model ? [config.primary.model] : existing.models,
        });
      } else if (config.primary.apiKey || config.primary.baseUrl) {
        this.add({
          id: 'primary',
          type: 'openai-compatible',
          baseUrl: config.primary.baseUrl || '',
          apiKey: config.primary.apiKey || '',
          models: config.primary.model ? [config.primary.model] : [],
          timeoutMs: 60000,
          enabled: true,
          priority: 10,
        });
      }
    }

    if (config.fallback) {
      const existing = this.providers.get('fallback');
      if (existing) {
        this.update('fallback', {
          ...config.fallback,
          type: 'anthropic-compatible',
          models: config.fallback.model ? [config.fallback.model] : existing.models,
        });
      } else if (config.fallback.apiKey || config.fallback.baseUrl) {
        this.add({
          id: 'fallback',
          type: 'anthropic-compatible',
          baseUrl: config.fallback.baseUrl || '',
          apiKey: config.fallback.apiKey || '',
          models: config.fallback.model ? [config.fallback.model] : [],
          timeoutMs: 60000,
          enabled: true,
          priority: 5,
        });
      }
    }
  }
}

export const providerRegistry = new ProviderRegistry();

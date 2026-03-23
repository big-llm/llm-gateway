import crypto from 'crypto';
import { getRedis, isRedisAvailable } from './redis.js';

export interface CacheEntry<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  tenantId: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  backend: 'memory' | 'redis';
}

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

class CacheService {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private hits = 0;
  private misses = 0;
  private defaultTtl = 3600000;
  private defaultPrefix = 'llm-cache';

  async get<T>(key: string, tenantId: string, options?: CacheOptions): Promise<T | null> {
    const redis = getRedis();
    const prefix = options?.prefix || this.defaultPrefix;
    const fullKey = `${prefix}:${key}`;

    if (redis && isRedisAvailable()) {
      const data = await redis.get(fullKey);
      if (data) {
        try {
          const entry: CacheEntry<T> = JSON.parse(data);
          if (entry.expiresAt > Date.now()) {
            // Tenant validation (defense-in-depth)
            if (tenantId && entry.tenantId && entry.tenantId !== tenantId) {
              // Cross-tenant access attempt - log error, emit metric, return null
              console.error('Cross-tenant cache access attempt', {
                entryTenantId: entry.tenantId,
                requestTenantId: tenantId,
                key: fullKey,
              });
              this.misses++;
              return null;
            }
            entry.hitCount++;
            await redis.setex(
              fullKey,
              Math.ceil((entry.expiresAt - Date.now()) / 1000),
              JSON.stringify(entry)
            );
            this.hits++;
            return entry.data;
          }
          await redis.del(fullKey);
        } catch {
          // Invalid JSON, continue to memory cache
        }
      }
    }

    const memoryEntry = this.memoryCache.get(fullKey) as CacheEntry<T> | undefined;
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      // Tenant validation (defense-in-depth)
      if (tenantId && memoryEntry.tenantId && memoryEntry.tenantId !== tenantId) {
        // Cross-tenant access attempt - log error, emit metric, return null
        console.error('Cross-tenant cache access attempt', {
          entryTenantId: memoryEntry.tenantId,
          requestTenantId: tenantId,
          key: fullKey,
        });
        this.misses++;
        return null;
      }
      memoryEntry.hitCount++;
      this.hits++;
      return memoryEntry.data;
    }

    if (memoryEntry) {
      this.memoryCache.delete(fullKey);
    }

    this.misses++;
    return null;
  }

  async set<T>(key: string, data: T, tenantId: string, options?: CacheOptions): Promise<void> {
    const redis = getRedis();
    const prefix = options?.prefix || this.defaultPrefix;
    const ttl = options?.ttl ?? this.defaultTtl;
    const fullKey = `${prefix}:${key}`;

    const entry: CacheEntry<T> = {
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      hitCount: 0,
      tenantId: tenantId || '',
    };

    this.memoryCache.set(fullKey, entry as CacheEntry<unknown>);

    if (redis && isRedisAvailable()) {
      await redis.setex(fullKey, Math.ceil(ttl / 1000), JSON.stringify(entry));
    }
  }

  async delete(key: string, options?: CacheOptions): Promise<void> {
    const redis = getRedis();
    const prefix = options?.prefix || this.defaultPrefix;
    const fullKey = `${prefix}:${key}`;

    this.memoryCache.delete(fullKey);

    if (redis && isRedisAvailable()) {
      await redis.del(fullKey);
    }
  }

  async clear(prefix?: string): Promise<void> {
    const targetPrefix = prefix || this.defaultPrefix;

    this.memoryCache.clear();

    const redis = getRedis();
    if (redis && isRedisAvailable()) {
      const keys = await redis.keys(`${targetPrefix}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  }

  async has(key: string, tenantId = '', options?: CacheOptions): Promise<boolean> {
    const cached = await this.get(key, tenantId, options);
    return cached !== null;
  }

  async getOrSet<T>(
    key: string,
    factory: () => T | Promise<T>,
    tenantId = '',
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key, tenantId, options);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    await this.set(key, data, tenantId, options);
    return data;
  }

  generateKey(...parts: string[]): string {
    return crypto.createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 32);
  }

  generateRequestKey(model: string, messages: unknown[], params?: Record<string, unknown>): string {
    const normalized = JSON.stringify({ messages, params });
    return this.generateKey(model, normalized);
  }

  generateTenantKey(
    tenantId: string,
    model: string,
    messages: unknown[],
    params?: Record<string, unknown>
  ): string {
    const normalized = JSON.stringify({ messages, params });
    const hash = this.generateKey(model, normalized);
    return `${this.defaultPrefix}:${tenantId}:${hash}`;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
      }
    }
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.memoryCache.size,
      hitRate: total > 0 ? this.hits / total : 0,
      backend: isRedisAvailable() ? 'redis' : 'memory',
    };
  }
}

export const cacheService = new CacheService();

setInterval(() => {
  cacheService.cleanup();
}, 60000);

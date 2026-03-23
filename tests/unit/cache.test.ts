import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cacheService, type CacheEntry } from '../../src/services/cache.js';

describe('CacheService - Tenant Isolation', () => {
  describe('generateTenantKey', () => {
    it('should produce different keys for same request with different tenants', () => {
      const model = 'claude-3-5-sonnet-20240620';
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const params = { temperature: 0.7 };

      const key1 = cacheService.generateTenantKey('org_abc:team_1', model, messages, params);
      const key2 = cacheService.generateTenantKey('org_xyz:team_2', model, messages, params);

      expect(key1).not.toBe(key2);
    });

    it('should produce same key for same request with same tenant', () => {
      const model = 'claude-3-5-sonnet-20240620';
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const params = { temperature: 0.7 };

      const key1 = cacheService.generateTenantKey('org_abc:team_1', model, messages, params);
      const key2 = cacheService.generateTenantKey('org_abc:team_1', model, messages, params);

      expect(key1).toBe(key2);
    });

    it('should include tenant prefix in key format', () => {
      const model = 'claude-3-5-sonnet-20240620';
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const tenantId = 'org_abc:team_1';

      const key = cacheService.generateTenantKey(tenantId, model, messages);

      // Key format should be: {prefix}:{tenantId}:{hash}
      // Default prefix is 'llm-cache'
      expect(key).toContain('llm-cache');
      expect(key).toContain(tenantId);
    });

    it('should handle tenant without team (orgId only)', () => {
      const model = 'claude-3-5-sonnet-20240620';
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const tenantId = 'org_abc';

      const key = cacheService.generateTenantKey(tenantId, model, messages);

      expect(key).toContain('org_abc');
    });
  });

  describe('CacheEntry interface with tenantId', () => {
    it('should include tenantId field in CacheEntry interface', () => {
      // This test validates the type at compile time
      // We're checking that CacheEntry can have tenantId
      const entry: CacheEntry<string> = {
        data: 'test',
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000,
        hitCount: 0,
        tenantId: 'org_abc:team_1',
      };

      expect(entry.tenantId).toBe('org_abc:team_1');
    });
  });

  describe('tenant validation in get()', () => {
    beforeEach(async () => {
      await cacheService.clear();
    });

    afterEach(async () => {
      await cacheService.clear();
    });

    it('should return cached data when tenantId matches', async () => {
      const key = 'test-key';
      const tenantId = 'org_abc:team_1';
      const testData = { message: 'Hello World' };

      // Set with tenant context
      await cacheService.set(key, testData, tenantId);

      // Get with same tenant - should return data
      const result = await cacheService.get(key, tenantId);

      expect(result).toEqual(testData);
    });

    it('should return null when tenantId does not match', async () => {
      const key = 'test-key';
      const tenantId1 = 'org_abc:team_1';
      const tenantId2 = 'org_xyz:team_2';
      const testData = { message: 'Secret data' };

      // Set with one tenant
      await cacheService.set(key, testData, tenantId1);

      // Try to get with different tenant - should return null
      const result = await cacheService.get(key, tenantId2);

      expect(result).toBeNull();
    });

    it('should log error on tenant mismatch', async () => {
      const key = 'test-key';
      const tenantId1 = 'org_abc:team_1';
      const tenantId2 = 'org_xyz:team_2';
      const testData = { message: 'Secret data' };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await cacheService.set(key, testData, tenantId1);
      await cacheService.get(key, tenantId2);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Cross-tenant cache access attempt',
        expect.objectContaining({
          entryTenantId: tenantId1,
          requestTenantId: tenantId2,
        })
      );

      consoleSpy.mockRestore();
    });

    it('should not increment hit counter on tenant mismatch', async () => {
      const key = 'test-key-unique';
      const tenantId1 = 'org_abc:team_1';
      const tenantId2 = 'org_xyz:team_2';
      const testData = { message: 'Secret data' };

      await cacheService.set(key, testData, tenantId1);

      // Get initial hit count
      const initialStats = cacheService.getStats();
      const initialHits = initialStats.hits;

      // Get with wrong tenant - should not count as hit
      await cacheService.get(key, tenantId2);

      // Get with correct tenant - should still work
      const result = await cacheService.get(key, tenantId1);
      expect(result).toEqual(testData);

      // Stats should show exactly 1 hit (from the correct tenant)
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(initialHits + 1);
    });

    it('should skip validation when tenantId is empty (backward compatibility)', async () => {
      const key = 'test-key';
      const testData = { message: 'Non-tenant data' };

      // Set without tenant (legacy behavior)
      await cacheService.set(key, testData, '');

      // Get without tenant should still work
      const result = await cacheService.get(key, '');
      expect(result).toEqual(testData);
    });
  });

  describe('set() with tenant metadata', () => {
    beforeEach(async () => {
      await cacheService.clear();
    });

    afterEach(async () => {
      await cacheService.clear();
    });

    it('should store entry with tenantId field', async () => {
      const key = 'test-key';
      const tenantId = 'org_abc:team_1';
      const testData = { message: 'Hello' };

      await cacheService.set(key, testData, tenantId);

      // Verify entry has tenantId
      const result = await cacheService.get(key, tenantId);
      expect(result).toEqual(testData);
    });

    it('should persist tenantId in memory cache', async () => {
      const key = 'test-key';
      const tenantId = 'org_abc:team_1';
      const testData = { message: 'Memory test' };

      await cacheService.set(key, testData, tenantId);

      // Get should validate tenant
      const result = await cacheService.get(key, tenantId);
      expect(result).toEqual(testData);

      // Wrong tenant should get null
      const wrongResult = await cacheService.get(key, 'org_xyz:team_2');
      expect(wrongResult).toBeNull();
    });

    it('should handle empty tenantId for backward compatibility', async () => {
      const key = 'test-key';
      const testData = { message: 'No tenant' };

      // Should not throw when tenantId is empty
      await expect(cacheService.set(key, testData, '')).resolves.not.toThrow();

      // Should be retrievable
      const result = await cacheService.get(key, '');
      expect(result).toEqual(testData);
    });
  });

  describe('integration - full tenant isolation', () => {
    beforeEach(async () => {
      await cacheService.clear();
    });

    afterEach(async () => {
      await cacheService.clear();
    });

    it('should fully isolate cached responses between tenants', async () => {
      const model = 'claude-3-5-sonnet-20240620';
      const messages = [{ role: 'user' as const, content: 'What is 2+2?' }];
      const params = { max_tokens: 100 };

      const tenant1 = 'org_abc:team_1';
      const tenant2 = 'org_xyz:team_2';

      const response1 = { answer: '4', cached: true, tenant: 'abc' };
      const response2 = { answer: 'four', cached: true, tenant: 'xyz' };

      // Cache responses for both tenants
      const key1 = cacheService.generateTenantKey(tenant1, model, messages, params);
      const key2 = cacheService.generateTenantKey(tenant2, model, messages, params);

      await cacheService.set(key1, response1, tenant1);
      await cacheService.set(key2, response2, tenant2);

      // Each tenant should get their own response
      const result1 = await cacheService.get(key1, tenant1);
      const result2 = await cacheService.get(key2, tenant2);

      expect(result1).toEqual(response1);
      expect(result2).toEqual(response2);
    });

    it('should prevent cross-tenant cache poisoning', async () => {
      const key = 'shared-key';
      const attackerTenant = 'org_attacker:team_1';
      const victimTenant = 'org_victim:team_1';

      const maliciousData = { injected: true };

      // Attacker tries to poison cache
      await cacheService.set(key, maliciousData, attackerTenant);

      // Victim's get should not return attacker's data
      const result = await cacheService.get(key, victimTenant);
      expect(result).toBeNull();
    });
  });
});

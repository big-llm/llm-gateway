import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cacheService } from '../../src/services/cache.js';

describe('Cache - Cross-Tenant Isolation', () => {
  const org1 = 'org_abc123';
  const org2 = 'org_xyz789';
  const team1 = 'team_def456';
  const team2 = 'team_uvw012';

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.clear();
  });

  afterEach(async () => {
    // Clear cache after each test
    await cacheService.clear();
  });

  describe('Key Generation', () => {
    it('should generate different keys for same request, different tenants', () => {
      const model = 'gpt-4';
      const messages = [{ role: 'user', content: 'Hello' }];

      const key1 = cacheService.generateTenantKey(`${org1}:${team1}`, model, messages);
      const key2 = cacheService.generateTenantKey(`${org2}:${team2}`, model, messages);

      expect(key1).not.toBe(key2);
    });

    it('should generate same key for same tenant', () => {
      const model = 'gpt-4';
      const messages = [{ role: 'user', content: 'Hello' }];

      const key1 = cacheService.generateTenantKey(`${org1}:${team1}`, model, messages);
      const key2 = cacheService.generateTenantKey(`${org1}:${team1}`, model, messages);

      expect(key1).toBe(key2);
    });

    it('should include tenant prefix in key', () => {
      const model = 'gpt-4';
      const messages = [{ role: 'user', content: 'Hello' }];
      const tenantId = `${org1}:${team1}`;

      const key = cacheService.generateTenantKey(tenantId, model, messages);

      // Key format should be: {prefix}:{tenantId}:{hash}
      expect(key).toContain('llm-cache');
      expect(key).toContain(tenantId);
    });

    it('should handle org-only tenant (no team)', () => {
      const model = 'gpt-4';
      const messages = [{ role: 'user', content: 'Hello' }];
      const tenantId = org1; // Org only, no team

      const key = cacheService.generateTenantKey(tenantId, model, messages);

      expect(key).toContain(org1);
    });
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should NOT return cached data for different tenant', async () => {
      const model = 'gpt-4';
      const messages = [{ role: 'user', content: 'Hello' }];
      const responseData = { choices: [{ message: { content: 'Response for Org1' } }] };

      // Org1 stores response
      const key1 = cacheService.generateTenantKey(`${org1}:${team1}`, model, messages);
      await cacheService.set(key1, responseData, `${org1}:${team1}`);

      // Org2 tries to access with same key format
      const key2 = cacheService.generateTenantKey(`${org2}:${team2}`, model, messages);
      const result = await cacheService.get(key2, `${org2}:${team2}`);

      // Should NOT get Org1's data
      expect(result).toBeNull();
    });

    it('should return cached data for same tenant', async () => {
      const model = 'gpt-4';
      const messages = [{ role: 'user', content: 'Hello' }];
      const responseData = { choices: [{ message: { content: 'Response for Org1' } }] };

      const key = cacheService.generateTenantKey(`${org1}:${team1}`, model, messages);
      await cacheService.set(key, responseData, `${org1}:${team1}`);

      const result = await cacheService.get(key, `${org1}:${team1}`);

      expect(result).toEqual(responseData);
    });

    it('should NOT return data when accessing with wrong tenant on same key', async () => {
      const model = 'gpt-4';
      const messages = [{ role: 'user', content: 'Hello' }];
      const responseData = { secret: 'Org1 Secret Data' };

      // Org1 stores with their tenant key
      const key1 = cacheService.generateTenantKey(`${org1}:${team1}`, model, messages);
      await cacheService.set(key1, responseData, `${org1}:${team1}`);

      // Org2 tries to access Org1's data using Org1's key but Org2's tenant
      const result = await cacheService.get(key1, `${org2}:${team2}`);

      // Should NOT get Org1's data - tenant validation fails
      expect(result).toBeNull();
    });
  });

  describe('Cache Key Collision', () => {
    it('should prevent data leakage even with hash collision', async () => {
      // Simulate hash collision by using same key
      const fakeKey = 'llm-cache:collision_test';
      const org1Data = { response: 'Org1 Secret Data' };
      const org2Data = { response: 'Org2 Secret Data' };

      // Org1 stores with their tenantId
      await cacheService.set(fakeKey, org1Data, `${org1}:${team1}`);

      // Try to retrieve with Org2 tenantId
      const result = await cacheService.get(fakeKey, `${org2}:${team2}`);

      // Should NOT get Org1's data due to tenant validation
      expect(result).toBeNull();
    });

    it('should allow same key for same tenant', async () => {
      const fakeKey = 'llm-cache:shared_key';
      const data = { response: 'Tenant Data' };

      // Store with tenant
      await cacheService.set(fakeKey, data, `${org1}:${team1}`);

      // Retrieve with same tenant
      const result = await cacheService.get(fakeKey, `${org1}:${team1}`);

      expect(result).toEqual(data);
    });
  });

  describe('Tenant Validation Logging', () => {
    it('should log ERROR on tenant mismatch', async () => {
      const key = 'test-key-logging';
      const tenantId1 = `${org1}:${team1}`;
      const tenantId2 = `${org2}:${team2}`;
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

    it('should not log error when tenant matches', async () => {
      const key = 'test-key-no-error';
      const tenantId = `${org1}:${team1}`;
      const testData = { message: 'Data' };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await cacheService.set(key, testData, tenantId);
      await cacheService.get(key, tenantId);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Cache Statistics', () => {
    it('should increment miss counter on tenant mismatch', async () => {
      const key = 'test-stats-key';
      const tenantId1 = `${org1}:${team1}`;
      const tenantId2 = `${org2}:${team2}`;
      const testData = { message: 'Secret data' };

      await cacheService.set(key, testData, tenantId1);

      const initialStats = cacheService.getStats();
      const initialMisses = initialStats.misses;

      // Access with wrong tenant - should be a miss
      await cacheService.get(key, tenantId2);

      const stats = cacheService.getStats();
      expect(stats.misses).toBe(initialMisses + 1);
    });

    it('should increment hit counter on valid tenant access', async () => {
      const key = 'test-hit-key';
      const tenantId = `${org1}:${team1}`;
      const testData = { message: 'Data' };

      await cacheService.set(key, testData, tenantId);

      const initialStats = cacheService.getStats();
      const initialHits = initialStats.hits;

      // Access with correct tenant - should be a hit
      await cacheService.get(key, tenantId);

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(initialHits + 1);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with empty tenantId for legacy code', async () => {
      const key = 'test-legacy-key';
      const testData = { message: 'Legacy data' };

      // Set without tenant (empty string)
      await cacheService.set(key, testData, '');

      // Get without tenant should still work
      const result = await cacheService.get(key, '');
      expect(result).toEqual(testData);
    });

    it('should allow access to empty tenant data from empty tenant request', async () => {
      const key = 'test-legacy-key2';
      const testData = { message: 'Legacy data' };

      await cacheService.set(key, testData, '');
      const result = await cacheService.get(key, '');

      expect(result).toEqual(testData);
    });
  });

  describe('Multi-Tenant Scenario Simulation', () => {
    it('should fully isolate data between two organizations', async () => {
      const model = 'claude-3-5-sonnet-20240620';
      const messages = [{ role: 'user', content: 'What is 2+2?' }];

      const org1Response = { answer: '4', tenant: 'org1' };
      const org2Response = { answer: 'four', tenant: 'org2' };

      // Both orgs make same request
      const key1 = cacheService.generateTenantKey(org1, model, messages);
      const key2 = cacheService.generateTenantKey(org2, model, messages);

      // Cache both responses
      await cacheService.set(key1, org1Response, org1);
      await cacheService.set(key2, org2Response, org2);

      // Each org should only see their own data
      const result1 = await cacheService.get(key1, org1);
      const result2 = await cacheService.get(key2, org2);

      expect(result1).toEqual(org1Response);
      expect(result2).toEqual(org2Response);
    });

    it('should isolate teams within same organization', async () => {
      const model = 'gpt-4';
      const messages = [{ role: 'user', content: 'Hello' }];

      const team1Response = { response: 'Team 1 data' };
      const team2Response = { response: 'Team 2 data' };

      const tenant1 = `${org1}:${team1}`;
      const tenant2 = `${org1}:${team2}`;

      const key1 = cacheService.generateTenantKey(tenant1, model, messages);
      const key2 = cacheService.generateTenantKey(tenant2, model, messages);

      await cacheService.set(key1, team1Response, tenant1);
      await cacheService.set(key2, team2Response, tenant2);

      // Teams should not see each other's data
      const team1AccessingTeam2 = await cacheService.get(key2, tenant1);
      const team2AccessingTeam1 = await cacheService.get(key1, tenant2);

      expect(team1AccessingTeam2).toBeNull();
      expect(team2AccessingTeam1).toBeNull();

      // But each team sees their own
      const team1OwnData = await cacheService.get(key1, tenant1);
      const team2OwnData = await cacheService.get(key2, tenant2);

      expect(team1OwnData).toEqual(team1Response);
      expect(team2OwnData).toEqual(team2Response);
    });

    it('should prevent cache poisoning attacks', async () => {
      const key = 'shared-key-attack';
      const attackerTenant = 'org_attacker:team_1';
      const victimTenant = 'org_victim:team_1';

      const maliciousData = { injected: true, malicious: true };

      // Attacker tries to poison cache
      await cacheService.set(key, maliciousData, attackerTenant);

      // Victim should NOT get attacker's data
      const result = await cacheService.get(key, victimTenant);
      expect(result).toBeNull();
    });
  });
});

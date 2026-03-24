import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { createServer } from '../../src/server/index.js';
import { resetConfig, loadConfig } from '../../src/config/index.js';
import { providerRegistry } from '../../src/services/provider-registry.js';

describe('Integration: Provider Health Tracking', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    resetConfig();

    loadConfig({
      SERVER_PORT: '3000',
      PRIMARY_API_KEY: 'test-key',
      PRIMARY_BASE_URL: 'http://localhost:1234',
      PRIMARY_MODEL: 'test-model',
      LOG_LEVEL: 'error',
      RATE_LIMIT_ENABLED: 'false',
    });

    app = await createServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Reset provider status before each test for clean state
    const providers = providerRegistry.getAll();
    for (const provider of providers) {
      providerRegistry.updateStatus(provider.id, {
        status: 'unhealthy',
        latencyMs: null,
        lastCheck: null,
        successCount: 0,
        errorCount: 0,
        totalCount: 0,
        recentOutcomes: [],
        lastLatencyMs: 0,
      });
    }
  });

  describe('GET /admin/health/providers', () => {
    it('should return all providers with health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/health/providers',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('providers');
      expect(Array.isArray(body.providers)).toBe(true);
    });

    it('should return provider status as healthy, degraded, or unhealthy', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/health/providers',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      for (const provider of body.providers) {
        expect(['healthy', 'degraded', 'unhealthy']).toContain(provider.status);
      }
    });

    it('should return successCount and totalCount for each provider', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/health/providers',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      for (const provider of body.providers) {
        expect(provider).toHaveProperty('successCount');
        expect(provider).toHaveProperty('totalCount');
        expect(typeof provider.successCount).toBe('number');
        expect(typeof provider.totalCount).toBe('number');
        expect(provider.successCount).toBeGreaterThanOrEqual(0);
        expect(provider.totalCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Health Status Transitions', () => {
    it('should reflect healthy status after sufficient successful outcomes', async () => {
      const providers = providerRegistry.getAll();
      const providerId = providers[0]?.id;

      if (!providerId) {
        // Skip if no providers configured
        return;
      }

      // Record 95+ successful outcomes to achieve healthy status (>=95% success rate)
      for (let i = 0; i < 95; i++) {
        providerRegistry.recordSuccessWithLatency(providerId, 100);
      }

      const status = providerRegistry.getStatus(providerId);
      expect(status?.status).toBe('healthy');
      expect(status?.successCount).toBe(95);
      expect(status?.totalCount).toBe(95);
    });

    it('should reflect degraded status at 80-94% success rate', async () => {
      const providers = providerRegistry.getAll();
      const providerId = providers[0]?.id;

      if (!providerId) {
        return;
      }

      // Record 85 successes and 15 errors = 85% success rate (degraded)
      for (let i = 0; i < 85; i++) {
        providerRegistry.recordSuccessWithLatency(providerId, 100);
      }
      for (let i = 0; i < 15; i++) {
        providerRegistry.recordError(providerId);
      }

      const status = providerRegistry.getStatus(providerId);
      expect(status?.status).toBe('degraded');
    });

    it('should reflect unhealthy status below 80% success rate', async () => {
      const providers = providerRegistry.getAll();
      const providerId = providers[0]?.id;

      if (!providerId) {
        return;
      }

      // Record 70 successes and 30 errors = 70% success rate (unhealthy)
      for (let i = 0; i < 70; i++) {
        providerRegistry.recordSuccessWithLatency(providerId, 100);
      }
      for (let i = 0; i < 30; i++) {
        providerRegistry.recordError(providerId);
      }

      const status = providerRegistry.getStatus(providerId);
      expect(status?.status).toBe('unhealthy');
    });

    it('should trigger degraded status on high latency (>5000ms)', async () => {
      const providers = providerRegistry.getAll();
      const providerId = providers[0]?.id;

      if (!providerId) {
        return;
      }

      // Record 100 successes with high latency (should be degraded)
      for (let i = 0; i < 100; i++) {
        providerRegistry.recordSuccessWithLatency(providerId, 6000);
      }

      const status = providerRegistry.getStatus(providerId);
      expect(status?.status).toBe('degraded');
    });

    it('should cap outcomes at 100 (rolling window)', async () => {
      const providers = providerRegistry.getAll();
      const providerId = providers[0]?.id;

      if (!providerId) {
        return;
      }

      // Record 200 outcomes - should cap at 100
      for (let i = 0; i < 200; i++) {
        providerRegistry.recordSuccessWithLatency(providerId, 100);
      }

      const status = providerRegistry.getStatus(providerId);
      expect(status?.recentOutcomes.length).toBe(100);
      expect(status?.successCount).toBe(200); // Total counts are cumulative
      expect(status?.totalCount).toBe(200);
    });
  });

  describe('Provider Registry Methods', () => {
    it('should track success and error counts correctly', async () => {
      const providers = providerRegistry.getAll();
      const providerId = providers[0]?.id;

      if (!providerId) {
        return;
      }

      // Record 10 successes and 5 errors
      for (let i = 0; i < 10; i++) {
        providerRegistry.recordSuccess(providerId);
      }
      for (let i = 0; i < 5; i++) {
        providerRegistry.recordError(providerId);
      }

      const status = providerRegistry.getStatus(providerId);
      expect(status?.successCount).toBe(10);
      expect(status?.errorCount).toBe(5);
      expect(status?.totalCount).toBe(15);
    });

    it('should update lastCheck timestamp on record', async () => {
      const providers = providerRegistry.getAll();
      const providerId = providers[0]?.id;

      if (!providerId) {
        return;
      }

      const beforeTime = new Date().toISOString();
      providerRegistry.recordSuccess(providerId);
      const status = providerRegistry.getStatus(providerId);

      expect(status?.lastCheck).not.toBeNull();
      expect(new Date(status!.lastCheck!).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime() - 1000
      );
    });

    it('should handle provider without recorded outcomes', async () => {
      const providers = providerRegistry.getAll();
      const providerId = providers[0]?.id;

      if (!providerId) {
        return;
      }

      // No outcomes recorded yet - should be unhealthy (no data)
      const status = providerRegistry.getStatus(providerId);
      expect(status?.totalCount).toBe(0);
      expect(status?.status).toBe('unhealthy');
    });
  });
});

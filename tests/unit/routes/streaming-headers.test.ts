import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fastify from 'fastify';
import { messagesRouter } from '../../../src/routes/messages.js';
import { resetConfig } from '../../../src/config/index.js';

// Mock the pipeline functions
vi.mock('../../../src/core/pipeline.js', () => ({
  processRequest: vi.fn().mockResolvedValue({
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: 'Hello' }],
    model: 'test-model',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5 },
  }),
  processStreamingRequest: vi
    .fn()
    .mockImplementation(async (_req, _opts, onChunk, _onError, onComplete) => {
      // Simulate streaming
      onChunk(
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n'
      );
      onComplete();
    }),
}));

vi.mock('../../../src/services/tenancy/index.js', () => ({
  tenancyService: {
    validateApiKey: vi.fn().mockResolvedValue({ valid: false }),
  },
}));

describe('Streaming response headers', () => {
  let app: ReturnType<typeof fastify>;

  beforeEach(async () => {
    resetConfig();
    app = fastify();
    await app.register(messagesRouter);
  });

  afterEach(async () => {
    await app.close();
    resetConfig();
    vi.clearAllMocks();
  });

  it('should include X-Accel-Buffering: no header in /messages/stream endpoint', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/messages/stream',
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'test',
        'anthropic-version': '2023-01-01',
      },
      body: {
        model: 'test-model',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Hello' }],
      },
    });

    // Check that the response has the X-Accel-Buffering header
    expect(response.headers['x-accel-buffering']).toBe('no');
  });

  it('should include X-Accel-Buffering: no header in /messages endpoint with stream: true', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/messages',
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'test',
        'anthropic-version': '2023-01-01',
      },
      body: {
        model: 'test-model',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      },
    });

    // Check that the response has the X-Accel-Buffering header
    expect(response.headers['x-accel-buffering']).toBe('no');
  });

  it('should NOT include X-Accel-Buffering header in non-streaming /messages response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/messages',
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'test',
        'anthropic-version': '2023-01-01',
      },
      body: {
        model: 'test-model',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Hello' }],
      },
    });

    // Non-streaming responses should NOT have X-Accel-Buffering
    expect(response.headers['x-accel-buffering']).toBeUndefined();
  });
});

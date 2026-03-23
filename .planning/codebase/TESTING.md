# Testing Patterns

**Analysis Date:** 2026-03-23

## Test Framework

**Runner:**

- Framework: Vitest (version 4.1.0)
- Config file: `vitest.config.ts`
- Global API: enabled (allows `describe`, `it`, `expect` without import in some contexts, but imports are still used in practice)

**Assertion Library:**

- Built into Vitest (expect API)

**Environment:**

- Node environment for all tests
- Type checking enabled with separate tsconfig (`tsconfig.test.json`)

**Run Commands:**

```bash
npm test                    # Run all tests (watch mode)
npm run test:run           # Run all tests once
npm run test:coverage      # Run tests with coverage report

# Run a single test file
npx vitest run tests/unit/schemas.test.ts

# Run tests matching a pattern
npx vitest run -t "should validate"

# Run only unit/integration tests
npx vitest run tests/unit/
npx vitest run tests/integration/
```

## Test File Organization

**Location:**

- Pattern: Separate from source code in `tests/` directory
- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- Test fixtures: `tests/fixtures/`

**Naming:**

- Pattern: `*.test.ts` suffix
- Example: `schemas.test.ts`, `providers.test.ts`, `client-simulation.test.ts`

**Configuration (from vitest.config.ts):**

```typescript
include: ['tests/**/*.test.ts'],
exclude: ['tests/fixtures/**'],
testTimeout: 30000,
hookTimeout: 30000,
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ComponentName', () => {
  beforeEach(() => {
    /* Setup - reset state, clear mocks */
  });
  afterEach(() => {
    /* Cleanup - close connections, restore mocks */
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      const result = someFunction(input);
      expect(result).toBe(expected);
    });

    it.each([
      [input1, expected1],
      [input2, expected2],
    ])('should handle %s', (input, expected) => {
      const result = someFunction(input);
      expect(result).toBe(expected);
    });
  });
});
```

**Example from codebase (`tests/unit/schemas.test.ts`):**

```typescript
describe('Anthropic Schemas', () => {
  describe('AnthropicMessageRequestSchema', () => {
    it('should validate a minimal valid request', () => {
      const validRequest = {
        model: 'claude-3-5-sonnet-20240620',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 1024,
      };

      const result = AnthropicMessageRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.model).toBe('claude-3-5-sonnet-20240620');
        expect(result.data.messages).toHaveLength(1);
      }
    });
  });
});
```

## Mocking

**Framework:** Vitest's vi (vi.fn, vi.mock)

**Pattern:**

```typescript
vi.mock('../some-module.js', () => ({
  someFunction: vi.fn().mockReturnValue('mocked value'),
}));
```

**Mocking Providers in Integration Tests (`tests/integration/client-simulation.test.ts`):**

```typescript
const createMockProvider = (name: string = 'mock'): Provider => ({
  type: PROVIDER_TYPES.OPENAI_COMPATIBLE,
  name,

  async listModels() {
    return {
      object: 'list',
      data: [{ id: 'test-model', name: 'test-model', owned_by: 'test' }],
    };
  },

  async createMessageNonStreaming(_messages, options) {
    // Return mock response
    return {
      /* ... */
    };
  },

  async createMessageStreaming(_messages, _options, handler) {
    // Stream mock chunks
    for (const chunk of chunks) {
      handler.onChunk(`data: ${JSON.stringify(chunk)}\n\n`);
      await new Promise((r) => setTimeout(r, 10));
    }
    handler.onComplete();
  },

  async healthcheck() {
    return true;
  },

  getClient() {
    return {} as any;
  },

  getConfig() {
    return { apiKey: 'test', baseUrl: 'test', defaultModel: 'test' };
  },
});
```

**What to Mock:**

- External services (providers, databases, Redis)
- Time-dependent logic (use `vi.useFakeTimers()`)
- Configuration (reset with `resetConfig()`, `loadConfig()`)
- Provider instances with `setMockProviders()`, `clearMockProviders()`

**What NOT to Mock:**

- Core business logic being tested
- Simple utility functions
- Schema validation (test with real data)

## Fixtures and Factories

**Test Data Location:**

- Inline in test files for specific test cases
- Can use `describe.each` for parameterized test data

**Factory Pattern (used in `tests/integration/client-simulation.test.ts`):**

```typescript
const mockConfig: ProviderConfig = {
  baseUrl: 'https://api.example.com/v1',
  apiKey: 'test-key',
  defaultModel: 'test-model',
  timeout: 30000,
  maxRetries: 3,
};
```

## Coverage

**Provider:** v8

**Reporter:**

- text (console output)
- json (`coverage/coverage-final.json`)
- html (`coverage/index.html`)

**Excluded from Coverage:**

```typescript
exclude: [
  'node_modules/',
  'dist/',
  'tests/',
  '**/*.config.*',
  '**/*.d.ts',
],
```

**View Coverage:**

```bash
npm run test:coverage
```

**Target:** Not explicitly enforced (no coverage threshold)

## Test Types

**Unit Tests:**

- Location: `tests/unit/`
- Scope: Individual functions, classes, schemas
- Examples: `tests/unit/schemas.test.ts`, `tests/unit/providers.test.ts`
- Characteristics:
  - Fast execution
  - No external dependencies (mocked)
  - Test one unit at a time

**Integration Tests:**

- Location: `tests/integration/`
- Scope: Full request/response cycle
- Examples: `tests/integration/client-simulation.test.ts`
- Characteristics:
  - Use Fastify's `inject()` method
  - Test complete HTTP flow
  - May use mock providers

## Common Patterns

**Async Testing:**

```typescript
it('should handle async operation', async () => {
  const result = await someAsyncFunction();
  expect(result).toBe(expected);
});
```

**Error Testing:**

```typescript
it('should throw on invalid input', () => {
  expect(() => createProvider('unknown' as any, mockConfig)).toThrow('Unknown provider type');
});

it('should return false when API key is invalid', async () => {
  const provider = new OpenAICompatibleProvider({
    ...mockConfig,
    apiKey: 'invalid-key',
  });
  const result = await provider.healthcheck();
  expect(result).toBe(false);
});
```

**Testing HTTP Endpoints (Fastify inject):**

```typescript
it('should handle simple text message', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/messages',
    headers: {
      'anthropic-version': '2023-06-01',
      'x-api-key': 'test',
    },
    payload: {
      model: 'claude-3-5-sonnet-20240620',
      messages: [{ role: 'user', content: 'Hello, how are you?' }],
      max_tokens: 1024,
    },
  });

  expect(response.statusCode).toBe(200);
  const body = JSON.parse(response.body);
  expect(body.type).toBe('message');
});
```

**Testing Streaming:**

```typescript
it('should stream text response', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/messages/stream',
    headers: { 'x-api-key': 'test' },
    payload: {
      model: 'test-model',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 100,
      stream: true,
    },
  });

  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toContain('text/event-stream');

  const body = response.body;
  expect(body).toContain('event: message_start');
  expect(body).toContain('event: content_block_delta');
  expect(body).toContain('event: message_stop');
});
```

**Parameterized Tests (it.each):**

```typescript
it.each([
  [input1, expected1],
  [input2, expected2],
])('should handle %s', (input, expected) => {
  const result = someFunction(input);
  expect(result).toBe(expected);
});
```

## Test Configuration

**Vitest Configuration (`vitest.config.ts`):**

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/fixtures/**'],
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.test.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/', '**/*.config.*', '**/*.d.ts'],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
```

## Best Practices

1. **Use `safeParse` for schema validation tests** - Avoid throwing on invalid input
2. **Reset state between tests** - Use `beforeEach`/`afterEach` to clean up
3. **Mock at the appropriate level** - Mock external dependencies, not internal logic
4. **Test both success and error cases** - Cover edge cases
5. **Use descriptive test names** - Should clearly state what is being tested
6. **Keep tests independent** - No ordering dependencies between tests

---

_Testing analysis: 2026-03-23_

# Coding Conventions

**Analysis Date:** 2026-03-23

## Naming Patterns

**Files:**

- Pattern: kebab-case
- Example: `streaming-pipeline.ts`, `api-keys.ts`, `rate-limit.ts`

**Functions:**

- Pattern: camelCase
- Example: `handleMessage`, `normalizeAnthropicRequest`, `createProvider`

**Variables:**

- Pattern: camelCase
- Example: `mockConfig`, `effectiveKey`, `validatedRequest`

**Classes/Interfaces/Types:**

- Pattern: PascalCase
- Example: `ProviderConfig`, `AnthropicMessageRequest`, `FastifyInstance`

**Constants:**

- Pattern: SCREAMING_SNAKE
- Example: `PROVIDER_TYPES`, `ANTHROPIC_MESSAGE_ROLES`, `PROVIDER_ERROR_TYPES`

**Environment Variables:**

- Pattern: SCREAMING_SNAKE
- Example: `PRIMARY_API_KEY`, `SERVER_PORT`, `LOG_LEVEL`

## Code Style

**Formatting:**

- Tool: Prettier (version 3.4.2)
- Config file: `.prettierrc`
- Key settings:
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "tabWidth": 2,
    "trailingComma": "es5",
    "printWidth": 100,
    "bracketSpacing": true,
    "arrowParens": "always"
  }
  ```

**Linting:**

- Tool: ESLint (version 9.18.0) with typescript-eslint
- Config file: `eslint.config.mjs`
- Key rules:
  - `@typescript-eslint/no-unused-vars` - Error (prefix with `_` to ignore)
  - `@typescript-eslint/no-explicit-any` - Warn
  - `@typescript-eslint/no-non-null-assertion` - Warn
  - `no-console` - Warn (use logger instead)
  - Uses `eslint-config-prettier` to disable conflicting rules

**TypeScript:**

- Strict mode enabled
- Target: ES2022, Module: ESNext
- ModuleResolution: bundler
- ESModuleInterop: true
- ForceConsistentCasingInFileNames: true
- noUnusedLocals: true, noUnusedParameters: true

## Import Organization

**Order:**

1. Built-in Node.js imports (e.g., `fs`, `path`)
2. External packages (e.g., `fastify`, `zod`, `@anthropic-ai/sdk`)
3. Internal local imports (e.g., `../providers/index.js`)
4. Type imports (use `import type`)

**File Extension:**

- Always use `.js` extension for local imports (ESM requirement)
- Example: `import { handleMessage } from './adapters/index.js';`

**Type Imports:**

- Use `import type` for type-only imports to improve performance
- Example: `import type { ProviderConfig } from '../providers/base.js';`

**Workspace Imports (for admin-ui):**

- Example: `import { someUtil } from 'admin-ui/src/utils/some-util';`

## Error Handling

**Provider Errors:**

- Use `classifyError()` from `src/providers/errors.js`
- Returns typed error with: type, message, statusCode, param, isRetryable, provider

**Error Types (from `src/providers/base.js`):**

- `INVALID_REQUEST` - 400
- `AUTHENTICATION` - 401
- `PERMISSION` - 403
- `NOT_FOUND` - 404
- `RATE_LIMIT` - 429
- `OVERLOADED` - 503
- `INTERNAL` - 500
- `TIMEOUT` - 408
- `NETWORK` - 0
- `UNKNOWN` - 500

**Error Handling Pattern:**

```typescript
try {
  await someOperation();
} catch (error) {
  const providerError = classifyError(error, 'provider-name');
  // Handle based on error type
}
```

## Logging

**Framework:** Pino (structured logging)

**Pattern:**

- Use logger from config: `import { getLogger } from '../config/index.js';`
- Avoid `console.log` (ESLint warns against it)
- Use appropriate log levels: `logger.debug`, `logger.info`, `logger.warn`, `logger.error`

**Example:**

```typescript
const logger = getLogger();
logger.debug({ requestId: req.id, model }, 'Processing request');
logger.error({ err: error }, 'Request failed');
```

## Validation Schemas

**Library:** Zod (version 3.24.1)

**Validation Pattern:**

```typescript
const result = AnthropicMessageRequestSchema.safeParse(request.body);
if (!result.success) {
  return reply.status(400).send({ error: result.error.errors });
}
const validated = result.data;
```

**Schema Files:**

- `src/schemas/anthropic.ts` - Anthropic API schemas
- `src/schemas/openai.ts` - OpenAI API schemas
- `src/schemas/canonical.ts` - Internal normalized format

## Comments

**When to Comment:**

- Complex business logic that isn't self-evident
- Non-obvious workarounds or decisions
- Public API documentation (JSDoc for functions)

**JSDoc/TSDoc:**

- Use for public function documentation
- Include @param and @returns types
- Example:

```typescript
/**
 * Creates a provider instance based on type
 * @param type - The provider type (openai-compatible or anthropic)
 * @param config - Provider configuration
 * @returns Provider instance
 */
```

## Function Design

**Parameters:**

- Prefer explicit typing for function parameters
- Use options objects for functions with many optional parameters

**Return Values:**

- Always declare return types for exported functions

**Async Functions:**

- Use `async/await` consistently
- Handle errors with try/catch

## Module Design

**Exports:**

- Use named exports for clarity
- Create `index.ts` barrel files for convenient imports

**Barrel Files:**

- Common in `src/adapters/index.ts`, `src/providers/index.ts`, `src/schemas/index.ts`
- Use to simplify import paths

---

_Convention analysis: 2026-03-23_

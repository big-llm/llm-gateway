# Codebase Structure

**Analysis Date:** 2026-03-23

## Directory Layout

```
/home/dikxant/claude-proxy/
├── src/
│   ├── adapters/           # Request/response format conversion
│   ├── admin/              # Admin API routes (orgs, teams, users, etc.)
│   ├── config/             # Environment-based configuration
│   ├── core/                # Core request processing pipeline
│   ├── db/                 # Database schema and connection (Drizzle ORM)
│   ├── providers/          # Abstract provider interface & implementations
│   ├── routes/             # Fastify HTTP endpoints
│   ├── schemas/            # Zod validation schemas
│   ├── server/             # Fastify server setup
│   ├── services/           # Core business logic
│   │   ├── cache.ts        # Redis-backed caching
│   │   ├── rate-limit/     # Redis-backed rate limiting
│   │   ├── tenancy/        # Multi-tenancy service (Orgs/Teams/Users)
│   │   └── ...
│   ├── streaming/          # SSE stream processing pipeline
│   ├── utils/              # Utility functions
│   ├── index.ts            # Application entry point
│   ├── admin-store.ts      # Central admin state management
│   └── ...
├── admin-ui/               # React/Vite admin dashboard (workspace)
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── fixtures/           # Test fixtures
└── package.json
```

## Directory Purposes

**`src/adapters/`:**

- Purpose: Request/Response format transformation
- Contains: `request.ts` - Anthropic ↔ OpenAI conversion; `error.ts` - error transformation; `streaming.ts` - stream-specific transformations
- Key files: `index.ts` (barrel export)

**`src/admin/`:**

- Purpose: Admin API route handlers
- Contains: Route modules for providers, models, logs, traces, api-keys, orgs, teams, users; auth middleware
- Key files: `index.ts` (registerAdminRoutes), `middleware.ts` (adminAuthMiddleware)
- Pattern: Each file exports a Fastify router function

**`src/config/`:**

- Purpose: Configuration loading and validation
- Contains: `index.ts` - config loading from env vars, logger init; `schema.ts` - Zod config schema
- Key files: `index.ts`, `schema.ts`

**`src/core/`:**

- Purpose: Request processing orchestration
- Contains: `pipeline.ts` - main processing logic for both streaming/non-streaming requests
- Key files: `pipeline.ts`

**`src/db/`:**

- Purpose: Database schema and connection management
- Contains: `schema.ts` - Drizzle schema definitions; `index.ts` - DB connection utilities
- Key files: `schema.ts`, `index.ts`

**`src/providers/`:**

- Purpose: LLM provider abstractions and implementations
- Contains: `base.ts` - Provider interface; `openai-compatible.ts`, `anthropic.ts`, `azure.ts`, `google.ts`, `cohere.ts`, `mistral.ts` - provider implementations; `errors.ts` - error classification
- Key files: `base.ts`, `index.ts`, `errors.ts`

**`src/routes/`:**

- Purpose: Public API HTTP endpoints
- Contains: `messages.ts` - Anthropic messages endpoint; `chat-completions.ts` - OpenAI-compatible chat; `models.ts` - model listing; `embeddings.ts` - embeddings endpoint; `index.ts` - route registration
- Key files: `index.ts`, `messages.ts`, `chat-completions.ts`

**`src/schemas/`:**

- Purpose: Zod validation schemas for API requests/responses
- Contains: `anthropic.ts` - Anthropic API schemas; `openai.ts` - OpenAI API schemas; `canonical.ts` - internal normalized format; `index.ts` - schema utilities
- Key files: `anthropic.ts`, `openai.ts`

**`src/server/`:**

- Purpose: Fastify server setup and configuration
- Contains: `index.ts` - server creation and startup
- Key files: `index.ts`

**`src/services/`:**

- Purpose: Core business logic and state management
- Contains: `cache.ts` - caching service; `rate-limit/` - rate limiting; `provider-registry.ts` - provider management; `model-mapping.ts` - model routing; `pricing.ts` - cost calculation; `request-logger.ts` - request logging; `budget.ts` - budget enforcement; `tenancy/` - multi-tenant management; `api-key.ts` - API key management; `redis.ts` - Redis connection
- Key files: `index.ts` (barrel export), individual service files

**`src/streaming/`:**

- Purpose: SSE stream processing
- Contains: `pipeline.ts` - stream orchestration; `stream-parser.ts` - parse provider streams; `event-translator.ts` - transform events; `sse-writer.ts` - write SSE responses
- Key files: `index.ts`, `pipeline.ts`

**`src/utils/`:**

- Purpose: Utility functions
- Contains: `id.ts` - ID generation; `env-file.ts` - env file loading; `index.ts` - utilities export
- Key files: `index.ts`, `id.ts`

**`src/admin-store.ts`:**

- Purpose: Central state container for admin operations
- Contains: AdminStore class - wraps all admin services (providers, models, logs, stats)
- Pattern: Singleton export `adminStore`

## Key File Locations

**Entry Points:**

- `src/index.ts`: Application bootstrap - loads config, initializes admin store, starts server
- `src/server/index.ts`: `startServer()` - Fastify listen; `createServer()` - Fastify instance setup

**Configuration:**

- `src/config/index.ts`: `loadConfig()`, `getConfig()`, `initLogger()`
- `src/config/schema.ts`: Config schema with defaults and validation

**Core Logic:**

- `src/core/pipeline.ts`: `processRequest()`, `processStreamingRequest()` - main request handlers
- `src/admin-store.ts`: `adminStore` singleton - central state access

**Public API Routes:**

- `src/routes/messages.ts`: `/v1/messages` and `/v1/messages/stream`
- `src/routes/chat-completions.ts`: `/v1/chat/completions`
- `src/routes/models.ts`: `/v1/models`
- `src/routes/embeddings.ts`: `/v1/embeddings`

**Admin API Routes:**

- `src/admin/index.ts`: `registerAdminRoutes()` - registers all admin sub-routes
- `src/admin/providers.ts`: `/admin/providers` CRUD
- `src/admin/models.ts`: `/admin/models` CRUD
- `src/admin/logs.ts`: `/admin/logs` query
- `src/admin/api-keys.ts`: `/admin/keys` CRUD

**Services:**

- `src/services/cache.ts`: `cacheService` - caching with Redis + memory fallback
- `src/services/rate-limit/index.ts`: `rateLimiter` - token bucket rate limiting
- `src/services/provider-registry.ts`: `providerRegistry` - provider management
- `src/services/model-mapping.ts`: `modelMappingService` - model routing

## Naming Conventions

**Files:**

- kebab-case: `request-pipeline.ts`, `api-key-service.ts`, `stream-parser.ts`
- Special: `index.ts` for barrel files, `schema.ts` for schemas

**Functions/Variables:**

- camelCase: `processRequest`, `convertToProviderRequest`, `cacheService`

**Classes/Interfaces/Types:**

- PascalCase: `Provider`, `AdminStore`, `RateLimiter`, `AnthropicMessageRequest`

**Constants:**

- SCREAMING_SNAKE: `PROVIDER_TYPES`, `ANTHROPIC_CONTENT_BLOCK_TYPES`

**Directories:**

- kebab-case: `rate-limit/`, `admin-ui/`, `node_modules/`

## Where to Add New Code

**New Public API Endpoint:**

- Add handler in `src/routes/` (new file or existing)
- Add Zod schema in `src/schemas/`
- Register in `src/routes/index.ts`

**New Admin API Endpoint:**

- Add handler in `src/admin/` (new file)
- Register in `src/admin/index.ts`
- Add to admin store if needed in `src/admin-store.ts`

**New Provider Implementation:**

- Implement `Provider` interface from `src/providers/base.ts`
- Register in `src/providers/index.ts`
- Add to provider registry

**New Service:**

- Add to `src/services/` (new file)
- Export in `src/services/index.ts`
- Use in relevant layer

**New Utility:**

- Add to `src/utils/` (new file)
- Export in `src/utils/index.ts`

## Special Directories

**`admin-ui/`:**

- Purpose: React admin dashboard
- Generated: Yes (Vite build)
- Contains: React components, Tailwind styles, TanStack Query hooks
- Not committed: Build artifacts (dist/)

**`tests/`:**

- Purpose: Test files
- Structure: `unit/` - unit tests; `integration/` - integration tests; `fixtures/` - test data
- Files follow source file pattern: `*.test.ts`, `*.spec.ts`

**`src/db/`:**

- Purpose: Drizzle ORM schema definitions
- Currently: Schema defined but may not be actively used (SQLite via better-sqlite3)

---

_Structure analysis: 2026-03-23_

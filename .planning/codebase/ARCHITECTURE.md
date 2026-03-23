# Architecture

**Analysis Date:** 2026-03-23

## Pattern Overview

**Overall:** Provider-agnostic LLM Gateway with Anthropic/OpenAI compatibility

**Key Characteristics:**

- **Multi-provider abstraction**: Supports OpenAI-compatible, Anthropic, Azure, Google, Cohere, Mistral backends through a unified Provider interface
- **Request/Response transformation**: Adapters normalize incoming requests to provider-specific formats and denormalize responses back to client format
- **Admin management layer**: In-memory store with admin API for managing providers, model mappings, and request logs
- **Middleware pipeline**: Request processing flows through validation, auth, rate limiting, budget checks, caching, and execution

## Layers

**HTTP Server Layer:**

- Purpose: Fastify HTTP server setup with CORS, rate limiting, helmet security
- Location: `src/server/index.ts`
- Contains: Fastify instance configuration, plugin registration, route registration
- Depends on: Fastify ecosystem packages (@fastify/cors, @fastify/helmet, @fastify/rate-limit)
- Used by: Entry point `src/index.ts`

**Routes Layer:**

- Purpose: HTTP endpoint handlers and request routing
- Location: `src/routes/`
- Contains: Public API routes (`messages.ts`, `models.ts`, `chat-completions.ts`, `embeddings.ts`)
- Depends on: Schemas, core pipeline, config
- Used by: Server layer via `src/routes/index.ts`

**Core Pipeline Layer:**

- Purpose: Request processing orchestration and provider invocation
- Location: `src/core/pipeline.ts`
- Contains: `processRequest()`, `processStreamingRequest()` - orchestrates model resolution, request building, provider calls, response conversion
- Depends on: Admin store, adapters, pricing service
- Used by: Routes layer

**Adapters Layer:**

- Purpose: Request/Response format conversion between formats
- Location: `src/adapters/`
- Contains: `request.ts` - converts Anthropic ↔ OpenAI formats for messages, content blocks, tools, tool choices
- Depends on: Schema definitions
- Used by: Core pipeline, streaming pipeline

**Providers Layer:**

- Purpose: Abstract provider interface and implementations
- Location: `src/providers/`
- Contains: `base.ts` - Provider interface definition; `openai-compatible.ts`, `anthropic.ts`, `azure.ts`, `google.ts`, `cohere.ts`, `mistral.ts` - implementations
- Depends on: Zod for validation
- Used by: Provider registry service

**Services Layer:**

- Purpose: Business logic and state management
- Location: `src/services/`
- Contains:
  - `provider-registry.ts` - Provider lifecycle and health tracking
  - `model-mapping.ts` - Anthropic model to provider model resolution
  - `cache.ts` - Redis-backed caching with memory fallback
  - `rate-limit/index.ts` - Token bucket rate limiting via Redis
  - `pricing.ts` - Cost calculation based on token usage
  - `request-logger.ts` - In-memory request log storage
  - `budget.ts` - Budget enforcement per org/team
  - `tenancy/index.ts` - Multi-tenant org/team/user management
- Depends on: Redis (optional), database
- Used by: Admin store, core pipeline, routes

**Schema Layer:**

- Purpose: Request/Response validation schemas
- Location: `src/schemas/`
- Contains: `anthropic.ts`, `openai.ts`, `canonical.ts` - Zod schemas for API validation
- Depends on: Zod
- Used by: Routes, adapters

**Admin Layer:**

- Purpose: Admin API routes and authentication
- Location: `src/admin/`
- Contains: `index.ts` - admin route registration; `middleware.ts` - admin token auth; individual routers for providers, models, logs, traces, api-keys, orgs, teams, users
- Depends on: Admin store, config
- Used by: Server layer

**Config Layer:**

- Purpose: Environment-based configuration management
- Location: `src/config/`
- Contains: `index.ts` - config loading from env vars; `schema.ts` - config validation
- Depends on: pino (logging), dotenv
- Used by: All layers

**Streaming Layer:**

- Purpose: SSE stream processing pipeline
- Location: `src/streaming/`
- Contains: `pipeline.ts`, `stream-parser.ts`, `event-translator.ts`, `sse-writer.ts`
- Depends on: Adapters
- Used by: Core pipeline (streaming variants)

## Data Flow

**Non-Streaming Request Flow:**

1. **Entry**: Client sends POST to `/v1/messages` with Anthropic-format body
2. **Schema Validation**: `AnthropicMessageRequestSchema` validates request body
3. **Authentication**: API key validated via config `PRIMARY_API_KEY`
4. **Model Resolution**: `adminStore.resolveModel()` maps Anthropic model → provider + provider model
5. **Request Normalization**: `convertToProviderRequest()` transforms Anthropic → OpenAI format
6. **Provider Invocation**: HTTP POST to provider's baseUrl with normalized request
7. **Response Denormalization**: `convertFromProviderResponse()` transforms OpenAI → Anthropic format
8. **Cost Calculation**: `pricingService` calculates cost from token usage
9. **Logging**: `adminStore.addLog()` records request, response, tokens, cost
10. **Response**: Client receives Anthropic-format response

**Streaming Request Flow:**

1. **Entry**: Client sends POST to `/v1/messages` or `/v1/messages/stream` with `stream: true`
2. **Validation/Auth**: Same as non-streaming steps 2-3
3. **Model Resolution**: Same as step 4
4. **Request Building**: Build provider request with `stream: true`
5. **Stream Processing**: `streamFromProvider()` reads SSE from provider
6. **Event Translation**: `convertOpenAIStreamChunkToAnthropic()` transforms each chunk to Anthropic SSE format
7. **Chunk Emission**: Chunks written directly to response stream
8. **Completion**: Final SSE events (`content_block_stop`, `message_stop`) sent
9. **Logging**: Request logged without response (streaming)

## Key Abstractions

**Provider Interface:**

- Purpose: Abstract LLM provider implementation
- Location: `src/providers/base.ts`
- Examples: `OpenAICompatibleProvider`, `AnthropicProvider`, `AzureProvider`
- Pattern: Interface with `listModels()`, `createMessageNonStreaming()`, `createMessageStreaming()`, `createEmbedding()`, `healthcheck()`

**AdminStore:**

- Purpose: Central state management for admin operations
- Location: `src/admin-store.ts`
- Pattern: Singleton class wrapping service layer (provider registry, model mapping, request logger)
- Used by: All admin routes, core pipeline for model resolution

**CacheService:**

- Purpose: Request/Response caching with dual-backend (Redis + memory)
- Location: `src/services/cache.ts`
- Pattern: LRU fallback to memory when Redis unavailable
- Key method: `generateRequestKey()` - SHA256 hash of model + messages + params

**RateLimiter:**

- Purpose: Per-identifier rate limiting with sliding window or token bucket
- Location: `src/services/rate-limit/index.ts`
- Pattern: Token bucket algorithm via Redis sorted sets, fallback to allow-all when unavailable

## Entry Points

**Main Entry:**

- Location: `src/index.ts`
- Triggers: `npm run dev` or `npm run start`
- Responsibilities: Load config, init logger, initialize admin store from config, start server

**Server Creation:**

- Location: `src/server/index.ts`
- Triggers: Called by main entry
- Responsibilities: Create Fastify instance, register plugins (CORS, helmet, rate-limit), register routes

**Route Registration:**

- Location: `src/routes/index.ts`
- Triggers: Called by server
- Responsibilities: Register request ID hook, response logging hook, health endpoints, API routers, admin routes

## Error Handling

**Strategy:** Error classification and HTTP status mapping

**Patterns:**

- `classifyError()` in `src/providers/errors.js` maps provider errors to standardized error types with status codes
- Error types: INVALID_REQUEST (400), AUTHENTICATION (401), PERMISSION (403), NOT_FOUND (404), RATE_LIMIT (429), OVERLOADED (503), INTERNAL (500), TIMEOUT (408), NETWORK (0)
- Streaming errors: Written as SSE error events to maintain stream connection
- All errors logged via `adminStore.addLog()` with status 'error'

## Cross-Cutting Concerns

**Logging:**

- Framework: Pino logger
- Config: `LOG_LEVEL`, `LOG_PRETTY` env vars
- Patterns: Request/response logging in routes index.ts hooks; provider call logging in pipeline.ts

**Validation:**

- Framework: Zod schemas
- Schemas: `src/schemas/anthropic.ts`, `openai.ts`, `canonical.ts`
- Usage: Route handlers call `schema.safeParse()`, admin API uses `toJsonSchema()` for Fastify

**Authentication:**

- Approach: API key validation via `PRIMARY_API_KEY` config
- Headers: `x-api-key`, `authorization`, `anthropic-auth-token` all accepted
- Admin: `ADMIN_TOKEN` env var for admin API via middleware

---

_Architecture analysis: 2026-03-23_

# External Integrations

**Analysis Date:** 2026-03-23

## APIs & External Services

### LLM Providers

**OpenAI-Compatible (Primary/Fallback):**

- Used for: Main LLM inference
- SDK/Client: `@ai-sdk/openai`, `openai`
- Auth: `PRIMARY_API_KEY`, `FALLBACK_API_KEY` env vars
- Base URL: `PRIMARY_BASE_URL`, `FALLBACK_BASE_URL`

**Anthropic:**

- Used for: Anthropic API compatibility
- SDK/Client: `@anthropic-ai/sdk`, `@ai-sdk/anthropic`
- Auth: `FALLBACK_API_KEY` env var (if type is anthropic)
- Base URL: `FALLBACK_BASE_URL`

**Google (Vertex AI / Gemini):**

- Used for: Google AI inference
- SDK/Client: OpenAI-compatible with `GoogleProvider`
- Auth: Provider-specific API key
- Implementation: `src/providers/google.ts`

**Azure OpenAI:**

- Used for: Microsoft Azure OpenAI deployment
- SDK/Client: OpenAI-compatible with `AzureProvider`
- Auth: Azure API key
- Implementation: `src/providers/azure.ts`

**Cohere:**

- Used for: Cohere LLM inference
- SDK/Client: OpenAI-compatible with `CohereProvider`
- Auth: Cohere API key
- Implementation: `src/providers/cohere.ts`

**Mistral:**

- Used for: Mistral AI inference
- SDK/Client: OpenAI-compatible with `MistralProvider`
- Auth: Mistral API key
- Implementation: `src/providers/mistral.ts`

## Data Storage

### Database

**SQLite:**

- Connection: File-based at `data/llm-gateway.db`
- Client: `better-sqlite3` with Drizzle ORM
- Schema: Tables for organizations, teams, users, api_keys, usage_logs, model_pricing
- Location: `src/db/index.ts`, `src/db/schema.ts`

**PostgreSQL (Optional):**

- Connection: `DATABASE_URL` env var (e.g., `postgresql://user:pass@host:5432/db`)
- Type: Configured via `DATABASE_TYPE=postgresql`
- Pool size: `DATABASE_POOL_SIZE` env var

### Cache

**Redis:**

- Connection: `REDIS_URL` env var (e.g., `redis://localhost:6379`)
- Client: `ioredis`
- Used for: Caching and rate limiting
- Enabled: `REDIS_ENABLED` (default: true)
- Key prefix: `REDIS_KEY_PREFIX` (default: `llm-gateway`)

### File Storage

**Local Filesystem:**

- Database: `data/llm-gateway.db`
- Logs: Console/pino logging
- No external object storage integration

## Authentication & Identity

**Custom Implementation:**

- API key-based authentication via `src/services/api-key.ts`
- Token hashing with SHA-256
- Encryption for key values
- Multi-tenancy: Organizations → Teams → Users hierarchy
- Location: `src/services/tenancy/`

**Admin Authentication:**

- Token-based via `ADMIN_TOKEN` env var
- Middleware: `src/admin/middleware.ts`

## Monitoring & Observability

**Logging:**

- Framework: `pino`
- Levels: trace, debug, info, warn, error, fatal
- Pretty print: `LOG_PRETTY=true`
- Config: `LOG_LEVEL` env var
- Location: `src/config/index.ts`

**Error Tracking:**

- Custom error classification in `src/providers/errors.js`
- Error types: INVALID_REQUEST, AUTHENTICATION, PERMISSION, NOT_FOUND, RATE_LIMIT, OVERLOADED, INTERNAL, TIMEOUT, NETWORK, UNKNOWN

## CI/CD & Deployment

**Development:**

- Local: `npm run dev` with tsx watch
- Admin UI: Vite dev server

**Production Build:**

- Server: `npm run build` compiles to `dist/`
- Admin UI: `npm run build:admin` builds React app

**Hosting:**

- Self-hosted (Node.js application)
- No cloud-specific integrations

## Environment Configuration

**Required env vars:**

| Variable             | Purpose                    | Example                    |
| -------------------- | -------------------------- | -------------------------- |
| `SERVER_PORT`        | HTTP server port           | 3000                       |
| `SERVER_HOST`        | Bind address               | 0.0.0.0                    |
| `PRIMARY_API_KEY`    | Primary LLM API key        | sk-...                     |
| `PRIMARY_BASE_URL`   | Primary provider base URL  | http://localhost:11434/v1  |
| `PRIMARY_MODEL`      | Primary model name         | gpt-4                      |
| `FALLBACK_API_KEY`   | Fallback LLM API key       | sk-ant-...                 |
| `FALLBACK_BASE_URL`  | Fallback provider base URL | https://api.anthropic.com  |
| `FALLBACK_MODEL`     | Fallback model name        | claude-3-5-sonnet-20240620 |
| `ADMIN_TOKEN`        | Admin API authentication   | your-secret-token          |
| `REDIS_URL`          | Redis connection           | redis://localhost:6379     |
| `DATABASE_URL`       | PostgreSQL connection      | postgresql://...           |
| `DATABASE_TYPE`      | Database type              | sqlite/postgresql          |
| `LOG_LEVEL`          | Logging level              | info                       |
| `RATE_LIMIT_ENABLED` | Enable rate limiting       | true                       |
| `RATE_LIMIT_MAX`     | Max requests per window    | 100                        |
| `CACHE_ENABLED`      | Enable response caching    | true                       |
| `CACHE_TTL`          | Cache TTL in seconds       | 3600                       |

**Secrets location:**

- Environment variables (`.env` file, not committed)
- API keys stored in env vars: `PRIMARY_API_KEY`, `FALLBACK_API_KEY`, `ADMIN_TOKEN`

## Webhooks & Callbacks

**Incoming:**

- None detected

**Outgoing:**

- LLM provider API calls (OpenAI, Anthropic, Google, Azure, Cohere, Mistral)
- Streaming responses via SSE

---

_Integration audit: 2026-03-23_

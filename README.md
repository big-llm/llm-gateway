# AI Bridge Proxy

A production-grade API gateway that provides unified OpenAI-compatible endpoints with enterprise features: multi-tenancy, budget enforcement, Redis-backed rate limiting, and tenant-isolated caching.

## What It Does

```
┌─────────────────────────────────────────────────────────────────┐
│                         Your Application                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │ OpenAI / Anthropic API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         LLM Gateway                              │
│                                                                 │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│  │ Tenant  │   │  Budget  │   │   Rate   │   │  Cache   │   │
│  │  Auth   │──▶│  Check   │──▶│  Limit   │──▶│ (Redis)  │   │
│  └─────────┘   └──────────┘   └──────────┘   └──────────┘   │
│       │                                                     │
│       │            ┌──────────────────────┐                 │
│       └───────────▶│   Provider Router   │                 │
│                    │  (Primary / Fallback) │                 │
│                    └──────────┬───────────┘                 │
│                               │                               │
│                    ┌──────────▼───────────┐                 │
│                    │    Provider Pool      │                 │
│                    │ OpenAI │ Azure │ Anthropic │ ...        │
│                    └───────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

| Feature                   | Description                                    |
| ------------------------- | ---------------------------------------------- |
| **Multi-Tenant Auth**     | API key validation per org/team/user           |
| **Budget Enforcement**    | Per-key spend limits with automatic blocking   |
| **Rate Limiting**         | Redis-backed sliding window rate limits        |
| **Tenant-Isolated Cache** | Cache keys prefixed with tenant context        |
| **Provider Failover**     | Automatic fallback on primary provider failure |
| **Admin Dashboard**       | Web UI for managing keys, orgs, teams, logs    |
| **Request Logging**       | Full request/response logging with latency     |

## API Endpoints

### OpenAI-Compatible

```bash
# Chat Completions
POST /v1/chat/completions

# List Models
GET /v1/models

# Embeddings
POST /v1/embeddings
```

### Anthropic-Compatible

```bash
POST /v1/messages
POST /v1/messages/stream
```

### Admin

```bash
GET  /admin/health
GET  /admin/keys
POST /admin/keys
GET  /admin/orgs
POST /admin/orgs
GET  /admin/logs
GET  /admin/stats
```

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your API keys

# Start
npm run dev
```

## Supported Providers

| Provider                    | Type              |
| --------------------------- | ----------------- |
| OpenAI                      | openai-compatible |
| Anthropic                   | anthropic         |
| Azure OpenAI                | azure             |
| Google AI                   | google            |
| Cohere                      | cohere            |
| Mistral                     | mistral           |
| Groq, Fireworks, Perplexity | openai-compatible |
| Ollama, LM Studio, vLLM     | openai-compatible |

Any OpenAI-compatible API works out of the box.

## Environment Variables

```bash
# Provider
PRIMARY_API_KEY=sk-...
PRIMARY_BASE_URL=https://api.openai.com/v1
PRIMARY_MODEL=gpt-4o

# Optional Fallback
FALLBACK_API_KEY=sk-ant-...
FALLBACK_BASE_URL=https://api.anthropic.com
FALLBACK_MODEL=claude-sonnet-4-20250514

# Server
SERVER_PORT=3000
ADMIN_TOKEN=your-secure-token

# Redis (optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
```

## Architecture

### Request Flow

1. **Tenant Auth** — Validate API key, extract org/team context
2. **Budget Check** — Verify key hasn't exceeded spend limit
3. **Rate Limit** — Check Redis-backed rate limit counter
4. **Cache Lookup** — Tenant-isolated cache (if enabled)
5. **Provider Route** — Send to primary, failover on error
6. **Log & Track** — Record request, update spend counters

### Multi-Tenancy Model

```
Organization
└── Team
    └── API Key
        ├── Rate limit (requests/minute)
        ├── Budget limit ($)
        └── Model access
```

### Caching Strategy

Cache keys include tenant context:

```
llm-cache:org_123:team_456:<request_hash>
```

Responses validated against tenant context before return — prevents cross-tenant data leakage.

## Admin Dashboard

Built-in React dashboard at `/admin`:

- **API Keys** — Create, rotate, manage keys with spend limits
- **Organizations** — Multi-tenant hierarchy
- **Teams** — Team-scoped resources
- **Models** — Provider model mappings
- **Logs** — Real-time request streaming
- **Stats** — Usage metrics per key/org

## Development

```bash
npm install
npm run dev      # Start gateway
npm run dev:admin # Start admin UI

npm test         # Run tests
npm run lint     # Lint
npm run typecheck # Typecheck
```

## Deployment

```bash
npm run build
npm start
```

Docker and Docker Compose examples in the project.

## License

MIT

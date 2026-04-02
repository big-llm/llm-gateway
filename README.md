# LLM Gateway

A production-grade multi-provider LLM gateway with enterprise features: unified OpenAI/Anthropic-compatible endpoints, multi-tenancy, budget enforcement, Redis-backed rate limiting, tenant-isolated caching, provider health tracking, and semantic caching.

**Perfect for teams who want:**

- Single API endpoint for multiple LLM providers (OpenAI, Anthropic, Azure, Google, etc.)
- Multi-tenant isolation and per-key budget enforcement
- Production-ready reliability with automatic failover and health monitoring
- Cost optimization through semantic caching

## What It Does

```
┌─────────────────────────────────────────────────────────────────┐
│                     Your Application                            │
└───────────────────────────────┬─────────────────────────────────┘
                                │ OpenAI / Anthropic API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LLM Gateway                                │
│                                                                 │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐      │
│  │ Tenant  │──▶│ Budget   │──▶│ Rate     │──▶│ Cache    │      │
│  │ Auth    │   │ Check    │   │ Limit    │   │ (Redis)  │      │
│  └─────────┘   └──────────┘   └──────────┘   └──────────┘      │
│                                                                 │
│                 ┌──────────────────────┐                        │
│      ┌─────────▶│ Provider Router      │                        │
│      │          │ (Primary / Fallback) │                        │
│      │          └──────────┬───────────┘                        │
│      │                     │                                    │
│      │          ┌──────────▼───────────┐                        │
│      │          │ Provider Pool        │                        │
│      │          │ OpenAI │ Anthropic   │                        │
│      │          │ Azure  │ Google      │                        │
│      │          │ Cohere │ Mistral     │                        │
│      └──────────└──────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

| Feature                      | Description                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| **Multi-Provider Support**   | OpenAI, Anthropic, Azure, Google, Cohere, Mistral, and 100+ OpenAI-compatible APIs |
| **Multi-Tenant Auth**        | API key validation per org/team/user with tenant isolation                         |
| **Budget Enforcement**       | Per-key spend limits with automatic blocking                                       |
| **Rate Limiting**            | Redis-backed sliding window rate limits                                            |
| **Tenant-Isolated Cache**    | Cache keys prefixed with tenant context, defense-in-depth validation               |
| **Provider Health Tracking** | Rolling window health monitoring with status dashboard                             |
| **Semantic Cache**           | Reduce costs with embedding-based cache similarity matching                        |
| **SSE Heartbeat**            | Keep streaming connections alive during long responses                             |
| **Provider Failover**        | Automatic fallback on primary provider failure                                     |
| **Admin Dashboard**          | React web UI for managing keys, orgs, teams, logs, and health                      |

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/bigllm/llm-gateway.git
cd llm-gateway

# Create environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env

# Start with Docker Compose
docker-compose up -d

# Gateway will be available at:
# - API: http://localhost:3000
# - Admin UI: http://localhost:5173
```

### Using npm

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your API keys
nano .env

# Development mode with hot reload
npm run dev

# Or build and run in production
npm run build
npm start
```

## API Endpoints

### OpenAI-Compatible

```bash
# Chat Completions (streaming and non-streaming)
POST /v1/chat/completions

# List Models
GET /v1/models

# Embeddings
POST /v1/embeddings
```

### Anthropic-Compatible

```bash
# Messages API (streaming and non-streaming)
POST /v1/messages
```

### Admin API

```bash
GET  /admin/health              # Health check
GET  /admin/health/providers    # Provider health status

# API Keys
GET  /admin/keys                # List all keys
POST /admin/keys                # Create new key
GET  /admin/keys/:id            # Get key details
PUT  /admin/keys/:id            # Update key
DELETE /admin/keys/:id          # Delete key

# Organizations
GET  /admin/orgs                # List all orgs
POST /admin/orgs                # Create new org

# Teams
GET  /admin/teams               # List all teams
POST /admin/teams               # Create new team

# Logs & Stats
GET  /admin/logs                # Request logs
GET  /admin/stats               # Usage statistics
```

## Supported Providers

| Provider                    | Type              | Environment Prefix |
| --------------------------- | ----------------- | ------------------ |
| OpenAI                      | openai-compatible | `PRIMARY_`         |
| Anthropic                   | anthropic         | `ANTHROPIC_`       |
| Azure OpenAI                | azure             | `AZURE_`           |
| Google AI                   | google            | `GOOGLE_`          |
| Cohere                      | cohere            | `COHERE_`          |
| Mistral                     | mistral           | `MISTRAL_`         |
| Groq, Fireworks, Perplexity | openai-compatible | Custom             |
| Ollama, LM Studio, vLLM     | openai-compatible | Custom             |

**Any OpenAI-compatible API** works out of the box. Simply configure the base URL and API key.

## Configuration

### Environment Variables

See `.env.example` for complete configuration options:

```bash
# Server
SERVER_PORT=3000
ADMIN_TOKEN=your-secure-admin-token

# Primary Provider (e.g., OpenAI)
PRIMARY_TYPE=openai-compatible
PRIMARY_API_KEY=sk-your-key
PRIMARY_BASE_URL=https://api.openai.com/v1
PRIMARY_MODELS=gpt-4o,gpt-4o-mini,gpt-3.5-turbo
PRIMARY_ENABLED=true
PRIMARY_PRIORITY=10

# Redis (for caching and rate limiting)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true

# SSE Heartbeat (for streaming)
SSE_HEARTBEAT_INTERVAL_MS=15000

# Semantic Cache (cost optimization)
SEMANTIC_CACHE_ENABLED=false
SEMANTIC_CACHE_SIMILARITY_THRESHOLD=0.15
```

### Multiple Providers

You can configure multiple providers with automatic failover:

```bash
# Primary - OpenAI
PRIMARY_TYPE=openai-compatible
PRIMARY_API_KEY=sk-...
PRIMARY_BASE_URL=https://api.openai.com/v1
PRIMARY_PRIORITY=10

# Fallback - Anthropic
FALLBACK_TYPE=anthropic
FALLBACK_API_KEY=sk-ant-...
FALLBACK_PRIORITY=20

# Local - Ollama
OLLAMA_TYPE=openai-compatible
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_PRIORITY=30
```

## Architecture

### Request Flow

1. **Tenant Auth** — Validate API key, extract org/team context
2. **Budget Check** — Verify key hasn't exceeded spend limit
3. **Rate Limit** — Check Redis-backed rate limit counter
4. **Cache Lookup** — Check exact match, then semantic similarity
5. **Provider Route** — Send to primary, automatic failover on error
6. **Log & Track** — Record request, update spend counters, collect metrics

### Multi-Tenancy Model

```
Organization
└── Team
    └── API Key
        ├── Rate limit (requests/minute)
        ├── Budget limit ($)
        └── Model access whitelist
```

### Caching Strategy

**Exact Match Cache:**

```
llm-cache:org_123:team_456:<request_hash>
```

**Semantic Cache:**
Uses embedding similarity to match semantically equivalent requests, reducing costs by serving similar responses from cache.

**Tenant Isolation:**

- Cache keys include tenant context
- Entry validation before returning data
- Prevents cross-tenant data leakage

## Admin Dashboard

Built-in React dashboard accessible at `/admin`:

- **API Keys** — Create, rotate, manage keys with spend limits
- **Organizations** — Multi-tenant hierarchy management
- **Teams** — Team-scoped resources and permissions
- **Models** — Provider model mappings
- **Logs** — Real-time request streaming
- **Stats** — Usage metrics per key/org
- **Health** — Provider health status dashboard

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev          # Start gateway with hot reload
npm run dev:admin    # Start admin UI with hot reload

# Run tests
npm test             # Run all tests
npm run test:coverage # Run with coverage report

# Code quality
npm run lint         # Lint code
npm run lint:fix     # Auto-fix lint issues
npm run typecheck    # TypeScript type checking

# Build
npm run build        # Build gateway
npm run build:admin  # Build admin UI
```

## Docker Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Using Docker

```bash
# Build image
docker build -t llm-gateway .

# Run container
docker run -d \
  -p 3000:3000 \
  -e PRIMARY_API_KEY=sk-your-key \
  -e ADMIN_TOKEN=your-admin-token \
  llm-gateway
```

## Health Monitoring

### Health Endpoints

```bash
# Basic health check
curl http://localhost:3000/health

# Provider health status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/admin/health/providers
```

### Provider Health Response

```json
{
  "providers": {
    "primary": {
      "status": "healthy",
      "successRate": 98.5,
      "avgLatency": 245,
      "totalRequests": 1000
    },
    "fallback": {
      "status": "degraded",
      "successRate": 85.2,
      "avgLatency": 1200,
      "totalRequests": 150
    }
  }
}
```

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Fastify
- **Database:** SQLite with Drizzle ORM
- **Cache:** Redis (optional, but recommended)
- **Admin UI:** React + Vite + Tailwind CSS
- **Testing:** Vitest
- **Language:** TypeScript

## Roadmap

### v1.0 (Current)

- ✅ Multi-provider support
- ✅ Tenant-isolated caching
- ✅ Budget enforcement
- ✅ Rate limiting
- ✅ Provider health tracking
- ✅ Semantic cache
- ✅ SSE heartbeat for streaming
- ✅ Admin dashboard

### v1.1 (Planned)

- Routing strategies (load balancing, cost-based routing)
- Circuit breaker per provider
- Webhook notifications
- Enhanced analytics

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Inspired by [LiteLLM](https://github.com/BerriAI/litellm) and built for teams who need enterprise-grade LLM gateway features.

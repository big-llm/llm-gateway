<div align="center">

# 🚀 LLM Gateway

### Production-Grade Multi-Provider LLM Gateway

[![Version](https://img.shields.io/github/v/release/big-llm/llm-gateway?include_prereleases&style=flat-square)](https://github.com/big-llm/llm-gateway/releases)
[![License](https://img.shields.io/github/license/big-llm/llm-gateway?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/node/v/llm-gateway?style=flat-square)](package.json)
[![Docker](https://img.shields.io/docker/pulls/bigllm/llm-gateway?style=flat-square)](https://hub.docker.com/r/bigllm/llm-gateway)
[![Stars](https://img.shields.io/github/stars/big-llm/llm-gateway?style=flat-square)](https://github.com/big-llm/llm-gateway/stargazers)

**English** | [中文](./README-ZH.md) | [Español](./README-ES.md)

A unified API gateway that abstracts away provider differences and enables enterprise features across multiple LLM providers.

</div>

---

## ⭐ Why LLM Gateway?

- **🔄 Unified API** — One endpoint for OpenAI, Anthropic, Azure, Google, and 100+ more
- **🏢 Multi-Tenant Isolation** — Secure tenant-scoped access with defense-in-depth
- **💰 Budget Enforcement** — Per-key spend limits prevent cost overruns
- **⚡ Rate Limiting** — Redis-backed sliding window rate limits
- **🔁 Automatic Failover** — Seamless fallback when providers fail
- **📊 Provider Health** — Real-time health monitoring dashboard
- **💾 Smart Caching** — Semantic similarity caching reduces costs
- **🌊 Streaming Support** — SSE heartbeat keeps long responses connected

---

## 🏁 Quick Start

### Docker (Recommended)

```bash
# Clone and start
git clone https://github.com/big-llm/llm-gateway.git
cd llm-gateway
cp .env.example .env

# Configure your API keys in .env, then:
docker-compose up -d

# Access at:
# API:    http://localhost:3000
# Admin:  http://localhost:5173
```

### npm

```bash
# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your API keys

# Run
npm run dev
```

---

## 📖 Documentation

| Section                          | Description                  |
| -------------------------------- | ---------------------------- |
| [API Reference](#-api-endpoints) | All available endpoints      |
| [Configuration](#-configuration) | Environment variables        |
| [Architecture](#-architecture)   | System design & flow         |
| [SDKs](#-sdks--client-libraries) | Python, Go, Ruby, JS clients |
| [Deployment](#-deployment)       | Docker & production          |
| [Contributing](CONTRIBUTING.md)  | Development guide            |

---

## 🔌 API Endpoints

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
# Messages API
POST /v1/messages
POST /v1/messages/stream
```

### Admin API

```bash
# Health & Monitoring
GET  /admin/health
GET  /admin/health/providers

# API Keys Management
GET    /admin/keys
POST   /admin/keys
GET    /admin/keys/:id
PUT    /admin/keys/:id
DELETE /admin/keys/:id

# Organizations & Teams
GET  /admin/orgs
POST /admin/orgs
GET  /admin/teams
POST /admin/teams

# Analytics
GET  /admin/logs
GET  /admin/stats
```

---

## 🌍 Supported Providers

| Provider                      | Type                | Quick Config  |
| ----------------------------- | ------------------- | ------------- |
| OpenAI                        | `openai-compatible` | `PRIMARY_*`   |
| Anthropic                     | `anthropic`         | `ANTHROPIC_*` |
| Azure OpenAI                  | `azure`             | `AZURE_*`     |
| Google AI                     | `google`            | `GOOGLE_*`    |
| Cohere                        | `cohere`            | `COHERE_*`    |
| Mistral                       | `mistral`           | `MISTRAL_*`   |
| Groq / Fireworks / Perplexity | `openai-compatible` | Custom prefix |
| Ollama / LM Studio / vLLM     | `openai-compatible` | Custom prefix |

> **Any OpenAI-compatible API** works out of the box.

---

## ⚙️ Configuration

```bash
# Server Settings
SERVER_PORT=3000
ADMIN_TOKEN=your-secure-admin-token

# Primary Provider (OpenAI example)
PRIMARY_TYPE=openai-compatible
PRIMARY_API_KEY=sk-your-key
PRIMARY_BASE_URL=https://api.openai.com/v1
PRIMARY_MODELS=gpt-4o,gpt-4o-mini,gpt-3.5-turbo
PRIMARY_ENABLED=true
PRIMARY_PRIORITY=10

# Fallback Provider (Anthropic example)
FALLBACK_TYPE=anthropic
FALLBACK_API_KEY=sk-ant-your-key
FALLBACK_PRIORITY=20

# Redis (enables caching & rate limiting)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true

# Streaming Heartbeat (keep connections alive)
SSE_HEARTBEAT_INTERVAL_MS=15000

# Semantic Cache (reduce costs)
SEMANTIC_CACHE_ENABLED=false
SEMANTIC_CACHE_SIMILARITY_THRESHOLD=0.15
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Application                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ OpenAI / Anthropic API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         LLM Gateway                              │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │  Tenant  │──▶│  Budget  │──▶│  Rate    │──▶│  Cache   │     │
│  │   Auth   │   │   Check  │   │  Limit   │   │ (Redis)  │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
│        │                                                      │
│        ▼                                                      │
│  ┌─────────────────────────────────────┐                       │
│  │       Provider Router               │                       │
│  │   (Primary + Fallback + Failover)  │                       │
│  └──────────────────┬──────────────────┘                       │
│                     │                                          │
│        ┌────────────┼────────────┐                             │
│        ▼            ▼            ▼                             │
│    ┌───────┐   ┌─────────┐   ┌───────┐                         │
│    │OpenAI │   │Anthropic│   │ Azure │   ...100+ providers     │
│    └───────┘   └─────────┘   └───────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **🔐 Tenant Auth** — Validate API key, extract org/team context
2. **💰 Budget Check** — Verify key hasn't exceeded spend limit
3. **🚦 Rate Limit** — Check Redis-backed rate limit counter
4. **💾 Cache Lookup** — Exact match → Semantic similarity
5. **🌐 Provider Route** — Primary → Fallback on error
6. **📝 Log & Track** — Record request, update counters, collect metrics

---

## 📊 Admin Dashboard

Built-in React dashboard at `/admin`:

- 🔑 **API Keys** — Create, rotate, manage with spend limits
- 🏢 **Organizations** — Multi-tenant hierarchy
- 👥 **Teams** — Team-scoped resources
- 🤖 **Models** — Provider model mappings
- 📜 **Logs** — Real-time request streaming
- 📈 **Stats** — Usage metrics per key/org
- ❤️ **Health** — Provider status dashboard

---

## 💻 SDKs & Client Libraries

### Python (pip)

```bash
pip install llm-gateway
```

```python
from llm_gateway import LLMGateway

gateway = LLMGateway(
    base_url="http://localhost:3000",
    api_key="your-api-key"
)
response = gateway.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response['choices'][0]['message']['content'])
```

[Python SDK →](python/README.md)

### Go

```bash
go get github.com/big-llm/llm-gateway/go
```

```go
import "github.com/big-llm/llm-gateway/go"

gateway := llmgateway.New(
    llmgateway.WithBaseURL("http://localhost:3000"),
    llmgateway.WithAPIKey("your-api-key"),
)
resp, _ := gateway.Chat.Completions.Create(ctx, &req)
```

[Go SDK →](go/README.md)

### Ruby (gem)

```bash
gem install llm-gateway
```

```ruby
require 'llm_gateway'
gateway = LLMGateway.new(base_url: 'http://localhost:3000', api_key: 'your-key')
response = gateway.chat.completions.create(model: 'gpt-4o', messages: [{role: 'user', content: 'Hello!'}])
```

[Ruby SDK →](ruby/README.md)

### npm / JavaScript

```bash
npm install llm-gateway
```

```javascript
import { LLMGateway } from 'llm-gateway';

const gateway = new LLMGateway({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-api-key',
});

const response = await gateway.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

---

## 🐳 Deployment

### Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Docker Standalone

```bash
# Build
docker build -t llm-gateway .

# Run
docker run -d \
  -p 3000:3000 \
  -e PRIMARY_API_KEY=sk-your-key \
  -e ADMIN_TOKEN=your-admin-token \
  llm-gateway
```

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev          # Gateway
npm run dev:admin    # Admin UI

# Run tests
npm test
npm run test:coverage

# Code quality
npm run lint
npm run typecheck

# Build
npm run build
npm run build:admin
```

---

## 🔧 Tech Stack

| Component | Technology              |
| --------- | ----------------------- |
| Runtime   | Node.js 20+             |
| Framework | Fastify                 |
| Database  | SQLite + Drizzle ORM    |
| Cache     | Redis                   |
| Admin UI  | React + Vite + Tailwind |
| Testing   | Vitest                  |
| Language  | TypeScript              |

---

## 🗺️ Roadmap

### v1.0 (Current)

- ✅ Multi-provider support (100+)
- ✅ Multi-tenant isolation
- ✅ Budget enforcement
- ✅ Rate limiting
- ✅ Provider health tracking
- ✅ Semantic caching
- ✅ SSE heartbeat
- ✅ Admin dashboard

### v1.1 (Next)

- [ ] Advanced routing (load balancing, cost-based)
- [ ] Circuit breaker per provider
- [ ] Webhook notifications
- [ ] Enhanced analytics

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Inspired by [LiteLLM](https://github.com/BerriAI/litellm) — the best open-source LLM gateway.

---

<div align="center">

**⭐ Star us on GitHub if this helped!**

Built with ❤️ by [Dikshant Gajera](https://github.com/dikshantgajera)

</div>

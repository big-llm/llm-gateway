<div align="center">

# 🚀 LLM Gateway

### Connect to 100+ LLM Providers — From Any Language

[![Version](https://img.shields.io/github/v/release/big-llm/llm-gateway?include_prereleases&style=flat-square)](https://github.com/big-llm/llm-gateway/releases)
[![License](https://img.shields.io/github/license/big-llm/llm-gateway?style=flat-square)](LICENSE)
[![Docker](https://img.shields.io/docker/pulls/bigllm/llm-gateway?style=flat-square)](https://hub.docker.com/r/bigllm/llm-gateway)
[![Stars](https://img.shields.io/github/stars/big-llm/llm-gateway?style=flat-square)](https://github.com/big-llm/llm-gateway/stargazers)

**One unified API. Access any LLM. Use any language.**

</div>

---

## 🚀 LLM Gateway — One API for 100+ LLM Providers

```bash
# One API call → Access ANY LLM provider
curl http://localhost:3000/v1/chat/completions \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hi"}]}'

# Just change the model name to switch providers
curl http://localhost:3000/v1/chat/completions \
  -d '{"model": "claude-sonnet-4-20250514", "messages": [{"role": "user", "content": "Hi"}]}'
```

**Unified API for OpenAI, Anthropic, Azure, Google, Cohere, Mistral, Groq, Ollama + 100 more**

---

## 📦 Use It Your Way

### 🐳 Docker (Easiest)

```bash
# Quick start
docker run -d -p 3000:3000 -e PRIMARY_API_KEY=sk-xxx bigllm/llm-gateway
```

### 🐍 Python

```bash
pip install llm-gateway
```

```python
from llm_gateway import LLMGateway
gateway = LLMGateway(base_url="http://localhost:3000", api_key="sk-xxx")
response = gateway.chat.completions.create(model="gpt-4o", messages=[{"role":"user","content":"Hi"}])
```

### 🟢 Go

```bash
go get github.com/big-llm/llm-gateway/go
```

```go
gateway := llmgateway.New(llmgateway.WithAPIKey("sk-xxx"))
resp, _ := gateway.Chat.Completions.Create(ctx, &req)
```

### 💎 Ruby

```bash
gem install llm-gateway
```

```ruby
gateway = LLMGateway.new(base_url: 'http://localhost:3000', api_key: 'sk-xxx')
response = gateway.chat.completions.create(model: 'gpt-4o', messages: [{role: 'user', content: 'Hi'}])
```

### 📦 npm / JavaScript

```bash
npm install llm-gateway
```

```javascript
import { LLMGateway } from 'llm-gateway';
const gateway = new LLMGateway({ baseUrl: 'http://localhost:3000', apiKey: 'sk-xxx' });
const response = await gateway.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hi' }],
});
```

### ☕ Java

```java
// Maven: com.llm-gateway:java-client:1.0.0
LLMGateway gateway = new LLMGateway("http://localhost:3000", "sk-xxx");
CompletionsResponse response = gateway.chat().createCompletions(request);
```

### 🍎 C# / .NET

```bash
dotnet add package LLMGateway
```

```csharp
var gateway = new LLMGatewayClient("http://localhost:3000", "sk-xxx");
var response = await gateway.Chat.CreateAsync(request);
```

### ⬡ curl (No SDK needed)

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-xxx" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hi"}]}'
```

---

## 🌍 Connect to ANY Provider

| Provider         | Config Example                      | Models               |
| ---------------- | ----------------------------------- | -------------------- |
| **OpenAI**       | `PRIMARY_TYPE=openai-compatible`    | GPT-4, GPT-3.5       |
| **Anthropic**    | `ANTHROPIC_TYPE=anthropic`          | Claude 3.5, Claude 3 |
| **Azure OpenAI** | `AZURE_TYPE=azure`                  | GPT-4, GPT-3.5 Azure |
| **Google AI**    | `GOOGLE_TYPE=google`                | Gemini Pro, Flash    |
| **Cohere**       | `COHERE_TYPE=cohere`                | Command R, Embed     |
| **Mistral**      | `MISTRAL_TYPE=mistral`              | Mistral Large, Small |
| **Groq**         | `GROQ_TYPE=openai-compatible`       | Mixtral, Llama       |
| **Ollama**       | `OLLAMA_TYPE=openai-compatible`     | Llama 3, Mistral     |
| **Fireworks**    | `FIREWORKS_TYPE=openai-compatible`  | Llama 3, Mixtral     |
| **Perplexity**   | `PERPLEXITY_TYPE=openai-compatible` | Sonar, Llama         |
| **Anyscale**     | `ANYSCALE_TYPE=openai-compatible`   | Mixtral, Llama 2     |
| **Together AI**  | `TOGETHER_TYPE=openai-compatible`   | Llama 3, Mistral     |
| **LM Studio**    | `LMSTUDIO_TYPE=openai-compatible`   | Local models         |
| **vLLM**         | `VLLM_TYPE=openai-compatible`       | Any vLLM model       |

**+ 100+ more OpenAI-compatible APIs**

---

## 🏁 Quick Start

```bash
# 1. Clone
git clone https://github.com/big-llm/llm-gateway.git
cd llm-gateway

# 2. Configure
cp .env.example .env
# Edit .env with your provider API keys

# 3. Run (Docker)
docker-compose up -d

# OR (npm)
npm install && npm run dev

# 4. Use!
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer sk-your-key" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello!"}]}'
```

**Access:** API `http://localhost:3000` | Admin UI `http://localhost:5173`

---

## ✨ Key Features

| Feature                 | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| 🔄 **100+ Providers**   | OpenAI, Anthropic, Azure, Google, Cohere, Mistral, Ollama... |
| 🏢 **Multi-Tenant**     | Org/Team/User isolation with API keys                        |
| 💰 **Budget Control**   | Per-key spend limits prevent cost overruns                   |
| 🚦 **Rate Limiting**    | Redis-backed sliding window limits                           |
| 🔁 **Auto Failover**    | Automatic fallback when providers fail                       |
| 📊 **Health Dashboard** | Real-time provider status monitoring                         |
| 💾 **Smart Caching**    | Exact + semantic similarity caching                          |
| 🌊 **Streaming**        | SSE heartbeat keeps long responses connected                 |
| 🔐 **Tenant Isolation** | Defense-in-depth cache security                              |

---

## 🔌 API Endpoints (OpenAI-Compatible)

### Chat Completions

```bash
POST /v1/chat/completions
```

### Embeddings

```bash
POST /v1/embeddings
```

### Models

```bash
GET /v1/models
```

### Admin

```bash
GET  /admin/health
GET  /admin/keys
POST /admin/keys
GET  /admin/orgs
GET  /admin/stats
```

---

## ⚙️ Configuration

```bash
# Server
SERVER_PORT=3000
ADMIN_TOKEN=your-admin-token

# Provider 1 (Primary)
PRIMARY_TYPE=openai-compatible
PRIMARY_API_KEY=sk-openai-xxx
PRIMARY_BASE_URL=https://api.openai.com/v1
PRIMARY_MODELS=gpt-4o,gpt-4o-mini

# Provider 2 (Fallback)
FALLBACK_TYPE=anthropic
FALLBACK_API_KEY=sk-ant-anthropic-xxx

# Redis (enables caching + rate limiting)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
```

---

## 🏗️ Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Auth       │───▶│   Budget     │───▶│   Rate       │───▶│   Cache      │
│   Check      │    │   Check      │    │   Limit      │    │   (Redis)    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                    │
                                                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          Provider Router                              │
│                   Primary → Fallback → Retry                         │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
    ┌────────┬────────┬────────┬────────┬────────┬────────┬────────┐
    ▼        ▼        ▼        ▼        ▼        ▼        ▼        ▼
  OpenAI  Anthropic  Azure   Google  Cohere  Mistral  Ollama  +100+
```

---

## 📊 Admin Dashboard

Access at `/admin`:

- 🔑 **API Keys** — Create, manage, rotate keys
- 🏢 **Organizations** — Multi-tenant management
- 👥 **Teams** — Team permissions
- 📈 **Stats** — Usage analytics
- ❤️ **Health** — Provider status

---

## 🐳 Deployment

### Docker Compose

```bash
docker-compose up -d
```

### Standalone Docker

```bash
docker build -t llm-gateway .
docker run -d -p 3000:3000 -e PRIMARY_API_KEY=sk-xxx llm-gateway
```

### Kubernetes

```yaml
# See examples/k8s/ for Helm charts
helm install llm-gateway ./charts/llm-gateway
```

---

## 🛠️ Development

```bash
npm install
npm run dev          # Gateway
npm run dev:admin    # Admin UI
npm test             # Run tests
npm run build        # Build
```

---

## 🔧 Tech Stack

| Layer     | Technology              |
| --------- | ----------------------- |
| Runtime   | Node.js 20+             |
| Framework | Fastify                 |
| Database  | SQLite + Drizzle        |
| Cache     | Redis                   |
| Admin UI  | React + Vite + Tailwind |
| Testing   | Vitest                  |
| Language  | TypeScript              |

---

## 🗺️ Roadmap

- ✅ v1.0 — Multi-provider, multi-tenant, caching, health tracking
- 🔄 v1.1 — Advanced routing, circuit breaker, webhooks

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — PRs welcome!

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

**⭐ Star us if this helped!** | Built with ❤️ by [Dikshant Gajera](https://github.com/dikshantgajera)

</div>

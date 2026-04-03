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

## 📦 Use It Your Way — Install Anywhere

### 🐳 Docker (Recommended)

#### Option 1: Quick Start (One command)

```bash
# Run instantly
docker run -d -p 3000:3000 \
  -e PRIMARY_API_KEY=sk-your-key \
  -e ADMIN_TOKEN=your-admin-token \
  bigllm/llm-gateway
```

#### Option 2: Docker Compose (Full setup with Redis)

```bash
# Clone the repository
git clone https://github.com/big-llm/llm-gateway.git
cd llm-gateway

# Create environment file
cp .env.example .env

# Edit .env with your API keys
nano .env

# Start all services (Gateway + Redis + Admin UI)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option 3: Build from Source

```bash
# Clone and build
git clone https://github.com/big-llm/llm-gateway.git
cd llm-gateway

# Build the image
docker build -t llm-gateway .

# Run the container
docker run -d -p 3000:3000 \
  -e PRIMARY_API_KEY=sk-your-key \
  -e ADMIN_TOKEN=your-admin-token \
  -v $(pwd)/data:/app/data \
  llm-gateway
```

#### Option 4: Kubernetes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: llm-gateway
  template:
    metadata:
      labels:
        app: llm-gateway
    spec:
      containers:
        - name: gateway
          image: bigllm/llm-gateway
          ports:
            - containerPort: 3000
          env:
            - name: PRIMARY_API_KEY
              value: 'sk-your-key'
            - name: ADMIN_TOKEN
              value: 'your-admin-token'
            - name: REDIS_URL
              value: 'redis://redis-service:6379'
            - name: REDIS_ENABLED
              value: 'true'
---
apiVersion: v1
kind: Service
metadata:
  name: llm-gateway
spec:
  selector:
    app: llm-gateway
  ports:
    - port: 80
      targetPort: 3000
  type: LoadBalancer
```

**Access:** API `http://localhost:3000` | Admin UI `http://localhost:5173`

**Docker Hub:** https://hub.docker.com/r/bigllm/llm-gateway

### 🐍 Python

```bash
# Install
pip install llm-gateway

# Use
python
```

```python
from llm_gateway import LLMGateway

gateway = LLMGateway(
    base_url="http://localhost:3000",
    api_key="sk-your-key"
)

response = gateway.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response['choices'][0]['message']['content'])
```

[Python SDK →](python/README.md)

### 🟢 Go

```bash
# Install
go get github.com/big-llm/llm-gateway/go
```

```go
package main

import "github.com/big-llm/llm-gateway/go"

func main() {
    gateway := llmgateway.New(
        llmgateway.WithBaseURL("http://localhost:3000"),
        llmgateway.WithAPIKey("sk-your-key"),
    )

    resp, err := gateway.Chat.Completions.Create(ctx, &llmgateway.ChatCompletionRequest{
        Model: "gpt-4o",
        Messages: []llmgateway.Message{
            {Role: "user", Content: "Hello!"},
        },
    })
}
```

[Go SDK →](go/README.md)

### 💎 Ruby

```bash
# Install
gem install llm-gateway
```

```ruby
require 'llm_gateway'

gateway = LLMGateway.new(
  base_url: 'http://localhost:3000',
  api_key: 'sk-your-key'
)

response = gateway.chat.completions.create(
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }]
)
puts response['choices'][0]['message']['content']
```

[Ruby SDK →](ruby/README.md)

### 📦 npm / JavaScript / TypeScript

```bash
# Install
npm install llm-gateway
# or
yarn add llm-gateway
# or
pnpm add llm-gateway
```

```javascript
import { LLMGateway } from 'llm-gateway';

const gateway = new LLMGateway({
  baseUrl: 'http://localhost:3000',
  apiKey: 'sk-your-key',
});

const response = await gateway.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(response.choices[0].message.content);
```

### ☕ Java

```xml
<!-- Add to pom.xml -->
<dependency>
    <groupId>com.llm-gateway</groupId>
    <artifactId>java-client</artifactId>
    <version>1.0.0</version>
</dependency>
```

```java
import com.llmgateway.*;

LLMGateway gateway = new LLMGateway("http://localhost:3000", "sk-your-key");

ChatCompletionRequest request = new ChatCompletionRequest()
    .model("gpt-4o")
    .messages(Arrays.asList(
        new Message().role("user").content("Hello!")
    ));

CompletionsResponse response = gateway.chat().createCompletions(request);
```

### 🍎 C# / .NET

```bash
# Install
dotnet add package LLMGateway
```

```csharp
using LLMGateway;

var gateway = new LLMGatewayClient("http://localhost:3000", "sk-your-key");

var request = new ChatCompletionRequest
{
    Model = "gpt-4o",
    Messages = new List<Message>
    {
        new Message { Role = "user", Content = "Hello!" }
    }
};

var response = await gateway.Chat.CreateAsync(request);
Console.WriteLine(response.Choices[0].Message.Content);
```

### ⬡ curl (No SDK needed)

```bash
# Chat completions
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-key" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# List models
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer sk-your-key"

# Embeddings
curl -X POST http://localhost:3000/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-key" \
  -d '{
    "model": "text-embedding-3-small",
    "input": "Hello world"
  }'
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

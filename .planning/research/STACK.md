# Stack Research

**Domain:** LLM API Gateway Enhancement
**Researched:** 2026-03-23
**Confidence:** HIGH

## Executive Summary

The current LLM Gateway has a solid foundation (Node.js, Fastify, Redis, Drizzle). To reach production-grade standards in 2025/2026, the recommended enhancements focus on:

1. **Token-aware rate limiting** — Replace request-based limits with token-based limits
2. **Semantic caching** — Add embedding-based cache for 40-60% cost reduction
3. **Additional providers** — DeepSeek, Grok, Amazon Bedrock, Google Vertex
4. **Observability** — Distributed tracing, cost analytics

## Recommended Stack

### Core Technologies

| Technology                | Version | Purpose                | Why Recommended                          |
| ------------------------- | ------- | ---------------------- | ---------------------------------------- |
| **Token Counting**        | —       | Accurate rate limiting | Required for token-aware rate limiting   |
| `tiktoken`                | ^0.8.0  | OpenAI tokenization    | Industry standard, accurate token counts |
| `@anthropic-ai/tokenizer` | latest  | Anthropic tokenization | Official tokenizer for Claude models     |

| Technology                | Version | Purpose                  | Why Recommended                          |
| ------------------------- | ------- | ------------------------ | ---------------------------------------- |
| **Semantic Caching**      | —       | Reduce LLM costs 40-60%  | Most impactful enhancement               |
| `redis` (with RediSearch) | ^5.0.0  | Vector similarity search | Two-layer caching (exact + semantic)     |
| `@xenova/transformers`    | ^2.17.0 | Local embeddings         | No external API for embedding generation |

| Technology            | Version | Purpose               | Why Recommended              |
| --------------------- | ------- | --------------------- | ---------------------------- |
| **Observability**     | —       | Production monitoring | Required for cost control    |
| `@langtrace/node-sdk` | latest  | Distributed tracing   | Full LLM observability stack |
| `@opentelemetry/api`  | ^1.9.0  | OpenTelemetry         | Vendor-neutral tracing       |

### Additional LLM Providers

| Provider             | SDK/Client                        | Status      | Notes                                       |
| -------------------- | --------------------------------- | ----------- | ------------------------------------------- |
| **DeepSeek**         | `@deepseek-sdk/client`            | Recommended | Best cost-performance ratio (R1, V3 models) |
| **xAI Grok**         | `@xai-sdk/client`                 | Recommended | Grok 4 with 400K context                    |
| **Amazon Bedrock**   | `@aws-sdk/client-bedrock-runtime` | Recommended | Claude on AWS, Nova models                  |
| **Google Vertex AI** | `@google-cloud/aiplatform`        | Recommended | Gemini 2.5, Gemma 3                         |
| **Cohere**           | `cohere`                          | Consider    | Enterprise focus, multilingual              |

### Supporting Libraries

| Library                     | Version | Purpose                | When to Use                     |
| --------------------------- | ------- | ---------------------- | ------------------------------- |
| `rate-limiter-flexible`     | ^6.0.0  | Token bucket algorithm | Production rate limiting        |
| `pino-otel`                 | latest  | OpenTelemetry logging  | Distributed tracing integration |
| `helicone`                  | latest  | LLM observability      | Alternative to custom tracing   |
| `@modelcontextprotocol/sdk` | latest  | MCP support            | Future-proof for tool calling   |

### Infrastructure

| Technology                  | Purpose               | Why                                          |
| --------------------------- | --------------------- | -------------------------------------------- |
| **Redis Stack**             | Cache + Vector Search | Single database for exact + semantic caching |
| **ElastiCache/Redis Cloud** | Managed Redis         | Production-grade reliability                 |

## Installation

```bash
# Token counting
npm install tiktoken @anthropic-ai/tokenizer

# Semantic caching
npm install redis@^5.0.0 @xenova/transformers

# Observability
npm install @langtrace/node-sdk @opentelemetry/api

# Rate limiting
npm install rate-limiter-flexible

# Additional providers
npm install @deepseek-sdk/client @xai-sdk/client @aws-sdk/client-bedrock-runtime @google-cloud/aiplatform cohere
```

## Alternatives Considered

| Recommended                            | Alternative                   | When to Use Alternative                             |
| -------------------------------------- | ----------------------------- | --------------------------------------------------- |
| `tiktoken` + `@anthropic-ai/tokenizer` | Third-party unified tokenizer | Our recommendation has accurate per-provider counts |
| Redis Stack semantic cache             | Qdrant/Pinecone separate      | Redis Stack simpler, less infrastructure            |
| Langtrace                              | Datadog/Dynatrace             | Langtrace built specifically for LLM observability  |
| DeepSeek, Grok, Bedrock                | Ollama (local)                | Only if privacy/offline requirements                |

## What NOT to Use

| Avoid                       | Why                                                  | Use Instead                           |
| --------------------------- | ---------------------------------------------------- | ------------------------------------- |
| Request-based rate limiting | Doesn't account for variable token costs per request | Token-aware rate limiting (RPM + TPM) |
| Exact-match only caching    | Misses 40-60% of cacheable requests                  | Two-layer caching (exact + semantic)  |
| Single-provider fallback    | One provider outage = full outage                    | Multi-provider with weighted routing  |
| In-memory cache alone       | Loses state on restart, no sharing across instances  | Redis with persistence                |
| Generic logging             | No token/cost tracking                               | LLM-specific observability            |

## Stack Patterns by Variant

**If traffic < 10K requests/day:**

- Start with exact-match caching only
- Add semantic caching as traffic grows

**If multi-tenant with strict isolation:**

- Use Redis namespaces per tenant
- Implement hierarchical rate limits (org → team → user)

**If cost-sensitive (startups):**

- Prioritize semantic caching + DeepSeek routing
- Use prompt caching (Anthropic, OpenAI)

**If enterprise with compliance:**

- Add Bedrock or Vertex for AWS/GCP integration
- Implement RBAC and audit logging

## Version Compatibility

| Package A                         | Compatible With   | Notes                           |
| --------------------------------- | ----------------- | ------------------------------- |
| `redis` ^5.0.0                    | `ioredis` ^5.10.1 | Both work, redis is newer API   |
| `@xenova/transformers` ^2.17.0    | Node.js 20+       | Requires native acceleration    |
| `@langtrace/node-sdk`             | Express/Fastify   | Auto-instrumentation available  |
| `@aws-sdk/client-bedrock-runtime` | AWS SDK v3        | Must use v3 modular SDKs        |
| `tiktoken` ^0.8.0                 | Node.js 18+       | Pure JavaScript, no native deps |

## Token-Aware Rate Limiting Implementation

The current `@fastify/rate-limit` handles request counting. For LLM workloads, add token-aware limiting:

```typescript
// Example: Dual-dimension rate limiting
// 1. RPM (requests per minute) - current implementation
// 2. TPM (tokens per minute) - NEW

interface TokenEstimate {
  inputTokens: number;
  outputTokensEstimate: number; // Based on max_tokens or history
}

async function checkTokenLimit(userId: string, estimate: TokenEstimate) {
  const key = `tpm:${userId}`;
  const current = await redis.incrby(key, estimate.inputTokens);
  await redis.expire(key, 60); // 1 minute window

  const limit = getUserLimit(userId).tpm;
  return current <= limit;
}
```

## Semantic Caching Architecture

```
Request → Exact Match (SHA-256 hash) → Hit → Return cached
         ↓ Miss
         → Semantic Match (embedding similarity) → Hit → Return cached
         ↓ Miss
         → LLM Call → Store in both caches → Return response
```

**Recommended thresholds:**

- Exact match: 100% hash match
- Semantic: cosine distance < 0.15 (adjust based on workload)

## Sources

- **Context7** — Redis Stack semantic caching, Tiktoken tokenization
- **Official Docs** — AWS Bedrock, Google Vertex, DeepSeek API docs
- **Community Research** — LiteLLM, Bifrost, Markaicode articles (HIGH confidence)
- **Production Case Studies** — Robinhood Bedrock (80% cost reduction), various 40-60% cache hit reports

---

_Stack research for: LLM Gateway Enhancement_
_Researched: 2026-03-23_

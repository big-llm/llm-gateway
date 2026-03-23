# Research Summary: LLM Gateway Architecture

**Project:** LLM Gateway
**Domain:** Enterprise LLM API Gateway Architecture
**Researched:** 2026-03-23
**Overall confidence:** HIGH

## Executive Summary

Enterprise LLM gateways in 2026 share a common architectural pattern built around six core components: client interface layer, intelligent routing layer, middleware layer (security, logging, PII masking), provider abstraction layer, observability layer, and administrative dashboard. This architecture extends traditional API gateway capabilities with AI-specific concerns including token-level rate limiting, cost governance, model-specific fallback chains, and semantic caching.

The current LLM Gateway codebase implements the foundational layer—provider abstraction, format adapters, multi-tenancy services, Redis-backed caching, and rate limiting. Research indicates the next evolution should focus on reliability engineering: circuit breakers per provider, intelligent fallback chains with error classification, cost-aware load balancing, and comprehensive observability with semantic telemetry.

## Key Findings

**Stack:** Node.js/TypeScript with Fastify, Drizzle ORM, SQLite, Redis (existing)
**Architecture:** Multi-layer pipeline with provider abstraction, format adapters, and service orchestration (existing)
**Critical gap:** Reliability patterns—circuit breakers, sophisticated fallback routing, and comprehensive observability

## Implications for Roadmap

Based on research, suggested enhancement phases:

1. **Reliability Engineering** — Add circuit breakers per provider, implement error classification for intelligent fallback routing, add retry budgets with cost containment
2. **Observability Enhancement** — Expand metrics collection beyond request logging to include latency histograms, cache hit rates, fallback frequency, cost tracking per model/org
3. **Smart Routing** — Implement cost-aware load balancing, semantic caching, and intelligent model selection based on request characteristics

## Confidence Assessment

| Area                 | Confidence | Notes                                                                      |
| -------------------- | ---------- | -------------------------------------------------------------------------- |
| Stack                | HIGH       | Current tech stack aligns with industry patterns (Fastify, Redis, Drizzle) |
| Features             | HIGH       | Existing features match enterprise gateway table stakes                    |
| Architecture         | HIGH       | Current architecture follows established patterns                          |
| Reliability Patterns | MEDIUM     | Circuit breakers and fallback patterns require implementation              |

## Gaps to Address

- Circuit breaker implementation per provider with configurable thresholds
- Error classification system driving fallback routing decisions
- Cost-aware load balancing with provider health scoring
- Semantic caching beyond exact request matching
- Comprehensive observability with semantic telemetry

---

# Technology Stack

**Project:** LLM Gateway
**Researched:** 2026-03-23

## Recommended Stack (Current + Enhancements)

### Core Framework

| Technology     | Version   | Purpose         | Why                                    |
| -------------- | --------- | --------------- | -------------------------------------- |
| Node.js        | >= 20.0.0 | Runtime         | Current—matches requirements           |
| TypeScript     | Latest    | Language        | Current—type safety                    |
| Fastify        | Latest    | HTTP server     | Current—low overhead, plugin ecosystem |
| Drizzle ORM    | Latest    | Database        | Current—type-safe SQL                  |
| better-sqlite3 | Latest    | Database driver | Current—SQLite performance             |

### Cache and Rate Limiting

| Technology      | Version | Purpose                | Why                          |
| --------------- | ------- | ---------------------- | ---------------------------- |
| Redis (ioredis) | Latest  | Caching, rate limiting | Current—industry standard    |
| Memory fallback | N/A     | Cache fallback         | Current—graceful degradation |

### Reliability Enhancements (To Add)

| Library             | Purpose                             | Why                                                 |
| ------------------- | ----------------------------------- | --------------------------------------------------- |
| Circuit breaker lib | Per-provider circuit breaking       | Prevents cascading failures during provider outages |
| Resilience patterns | Retry with backoff, fallback chains | Standard patterns from microservices                |
| OpenTelemetry       | Distributed tracing                 | Industry standard observability                     |

### Observability

| Technology         | Purpose                    | Why                           |
| ------------------ | -------------------------- | ----------------------------- |
| Pino (existing)    | Structured logging         | Current—low overhead          |
| Prometheus metrics | Latency, error rates, cost | Industry standard for metrics |
| OpenTelemetry      | Distributed tracing        | Cross-service visibility      |

## Installation

```bash
# Core (existing)
npm install fastify @fastify/cors @fastify/helmet @fastify/rate-limit drizzle-orm better-sqlite3 ioredis pino

# Reliability enhancements
npm install circuit-breaker-js pybreaker  # or similar

# Observability
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentation-node prom-client
```

---

# Feature Landscape

**Domain:** Enterprise LLM API Gateway
**Researched:** 2026-03-23

## Table Stakes

Features users expect in any production gateway. Missing equals incomplete.

| Feature                         | Why Expected                                   | Complexity | Status     |
| ------------------------------- | ---------------------------------------------- | ---------- | ---------- |
| Multi-provider abstraction      | Route to OpenAI, Anthropic, Azure, etc.        | High       | ✓ Existing |
| Request/response transformation | Normalize between OpenAI and Anthropic formats | Medium     | ✓ Existing |
| API key authentication          | Secure access to gateway                       | Low        | ✓ Existing |
| Rate limiting                   | Prevent quota exhaustion                       | Medium     | ✓ Existing |
| Budget enforcement              | Control spend per org/team                     | Medium     | ✓ Existing |
| Request logging                 | Audit trail for usage                          | Low        | ✓ Existing |
| Health endpoints                | Service availability checks                    | Low        | ✓ Existing |
| Streaming support               | SSE for real-time responses                    | Medium     | ✓ Existing |

## Differentiators

Features that set enterprise gateways apart from basic proxies.

| Feature                       | Value Proposition                                  | Complexity | Status     |
| ----------------------------- | -------------------------------------------------- | ---------- | ---------- |
| Circuit breakers per provider | Fail fast during outages, prevent rate limit waste | Medium     | To Build   |
| Intelligent fallback chains   | Automatic failover with error classification       | Medium     | To Build   |
| Semantic caching              | Cache similar prompts, not exact matches           | High       | To Build   |
| Cost-aware load balancing     | Route based on latency/cost/quality tradeoffs      | Medium     | To Build   |
| Hierarchical budgets          | Org → Team → User budget enforcement               | Medium     | Partial    |
| Observability dashboards      | Latency histograms, cost tracking, fallback rates  | Medium     | To Enhance |
| Quality monitoring            | Response quality, hallucination detection          | High       | Future     |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature             | Why Avoid                             | What to Do Instead |
| ------------------------ | ------------------------------------- | ------------------ |
| GraphQL API              | Adds complexity without clear benefit | Keep REST for now  |
| Real-time WebSocket chat | Not in requirements scope             | N/A                |
| Mobile SDKs              | Out of scope per PROJECT.md           | N/A                |
| Model fine-tuning        | Not gateway responsibility            | External tooling   |

## Feature Dependencies

```
Circuit Breakers → Intelligent Fallbacks → Cost-aware Routing
       ↓                    ↓                      ↓
  Error Classification ← Retry Logic ← Retry Budget

Observability (metrics, tracing) ← All components
```

## MVP Recommendation

Current codebase already covers MVP table stakes. Next priority:

1. **Circuit breakers per provider** — Prevents cascading failures during outages
2. **Error classification system** — Drives intelligent fallback routing
3. **Enhanced observability** — Metrics beyond request logs

---

# Architecture Patterns

**Domain:** Enterprise LLM API Gateway
**Researched:** 2026-03-23

## Recommended Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT APPLICATIONS                             │
│         (Web apps, Internal tools, External APIs, Agents)                  │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT INTERFACE LAYER                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ OpenAI Format   │  │ Anthropic Format│  │ Admin API               │  │
│  │ /v1/chat/       │  │ /v1/messages    │  │ /admin/*               │  │
│  │ completions     │  │                 │  │                        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MIDDLEWARE LAYER                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│  │ Schema          │  │ Authentication  │  │ Rate Limiting           │    │
│  │ Validation      │  │ (API Keys)      │  │ (Token Bucket)          │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│  │ Budget          │  │ PII Masking     │  │ Request Logging         │    │
│  │ Enforcement     │  │                 │  │                         │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘    │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ROUTING LAYER                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐     │
│  │ Model           │  │ Circuit         │  │ Intelligent             │     │
│  │ Resolution      │  │ Breakers        │  │ Fallback Chains         │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘     │
│  ┌─────────────────┐  ┌─────────────────┐                                   │
│  │ Cost-aware      │  │ Retry           │                                   │
│  │ Load Balancing  │  │ Budgets         │                                   │
│  └─────────────────┘  └─────────────────┘                                   │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROVIDER ABSTRACTION LAYER                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│  │ OpenAI          │  │ Anthropic       │  │ Azure                   │    │
│  │ Compatible      │  │                  │  │                         │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│  │ Google          │  │ Cohere          │  │ Mistral                 │    │
│  │                 │  │                 │  │                         │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘    │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OBSERVABILITY LAYER                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│  │ Request Logs    │  │ Prometheus      │  │ OpenTelemetry           │    │
│  │                 │  │ Metrics         │  │ Traces                  │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘    │
│  ┌─────────────────┐  ┌─────────────────┐                                  │
│  │ Cost Tracking   │  │ Fallback        │                                  │
│  │                 │  │ Monitoring      │                                  │
│  └─────────────────┘  └─────────────────┘                                  │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ADMIN DASHBOARD                                     │
│         (Provider config, API keys, budgets, analytics, logs)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component          | Responsibility                                                     | Communicates With                |
| ------------------ | ------------------------------------------------------------------ | -------------------------------- |
| Client Interface   | Parse and validate incoming requests, route to appropriate handler | Middleware Layer                 |
| Schema Validation  | Zod-based request/response validation                              | Client Interface, Routes         |
| Authentication     | API key validation, admin token verification                       | Schema Validation, Admin Store   |
| Rate Limiting      | Token bucket rate limiting via Redis                               | Authentication, Provider Layer   |
| Budget Enforcement | Per-org/team spend limits                                          | Rate Limiting, Request Logger    |
| Model Resolution   | Map abstract model names to provider+model                         | Routing Layer                    |
| Circuit Breakers   | Track provider health, fail fast on outages                        | Model Resolution, Provider Layer |
| Fallback Chains    | Sequential provider failover                                       | Circuit Breakers, Provider Layer |
| Provider Layer     | Execute actual LLM API calls                                       | Fallback Chains, Observability   |
| Cache Service      | Redis-backed response caching                                      | Provider Layer                   |
| Request Logger     | Persist request/response data                                      | All layers                       |

### Data Flow

**Non-Streaming Request Flow:**

1. **Client Interface**: Client sends POST to `/v1/messages` or `/v1/chat/completions`
2. **Schema Validation**: Zod schema validates request body, content type
3. **Authentication**: API key validated via tenancy service
4. **Rate Limiting**: Token bucket check against Redis, reject if exceeded
5. **Budget Check**: Verify org/team has remaining budget
6. **Model Resolution**: Map requested model → provider + provider model
7. **Circuit Breaker Check**: Verify provider circuit is closed
8. **Cache Lookup**: Generate request key, check cache
9. **Provider Invoke**: HTTP POST to provider API
10. **Response Processing**: Transform to client format
11. **Cost Calculation**: Calculate tokens and cost
12. **Logging**: Record request, response, tokens, cost
13. **Response**: Return formatted response to client

**Streaming Request Flow:**

1. **Steps 1-7**: Same as non-streaming
2. **Stream Init**: Start SSE connection to provider
3. **Chunk Processing**: Transform each chunk to client format
4. **Chunk Emission**: Write SSE events to response stream
5. **Completion**: Send final SSE events
6. **Logging**: Log request without full response (streaming)

**Fallback Flow:**

1. **Primary Failure**: Provider returns error (429, 5xx, timeout)
2. **Error Classification**: Determine if error is retryable
3. **Retry**: Apply exponential backoff with jitter
4. **Circuit Update**: Increment failure count for provider
5. **Fallback**: If retries exhausted or non-retryable, try next provider
6. **Success**: Return first successful response
7. **Exhausted**: If all providers fail, return degraded response

## Patterns to Follow

### Pattern 1: Circuit Breaker per Provider

**What:** Track failure rates per provider, open circuit when threshold exceeded
**When:** Provider has elevated error rate or latency
**Example:**

```typescript
interface CircuitBreaker {
  failMax: number; // Open after this many failures
  resetTimeout: number; // Seconds before trying again
  halfOpenMaxCalls: number; // Test calls in half-open state
  state: 'closed' | 'open' | 'half-open';
}
```

**Implementation:**

- Maintain separate circuit breaker per provider
- Track: failure count, success count, last failure time, current state
- Open on: N consecutive failures OR M% failures in sliding window
- Half-open: Allow limited test requests to verify recovery
- Close: Reset state after N consecutive successes

### Pattern 2: Intelligent Fallback Chains

**What:** Ordered provider list with error-type-aware routing
**When:** Primary provider fails, route to fallback
**Example:**

```typescript
interface FallbackChain {
  primary: ProviderConfig;
  fallbacks: ProviderConfig[];
  errorRouting: ErrorClassifier;
}
```

**Implementation:**

- Define priority-ordered provider list per model
- Classify errors by type:
  - Retry immediately: 408, 429, 500, 502, 503, 504
  - Skip to fallback: 501, 503 (prolonged), content policy
  - Fail immediately: 400 (context overflow), 401, 403
- Apply per-provider timeout using `Promise.race()`
- Track fallback hit rate, alert when elevated

### Pattern 3: Retry with Exponential Backoff + Jitter

**What:** Retry failed requests with increasing delay and randomness
**When:** Transient errors (network blip, temporary overload)
**Example:**

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const jitter = Math.random() * baseDelay * 0.5;
      const delay = baseDelay * Math.pow(2, attempt) + jitter;
      await sleep(delay);
    }
  }
}
```

### Pattern 4: Cost-Aware Load Balancing

**What:** Route requests based on latency, cost, and quality tradeoffs
**When:** Multiple providers offer same capability at different price/performance
**Example:**

```typescript
interface ProviderScore {
  provider: string;
  latencyScore: number; // Lower is better
  costScore: number; // Lower is better
  qualityScore: number; // Higher is better
  healthScore: number; // Higher is better
  weightedTotal: number;
}
```

**Implementation:**

- Track P50/P95 latency per provider
- Track cost per 1K tokens per provider
- Track error rate as health indicator
- Calculate weighted score per request type
- Route to highest-scoring provider

### Pattern 5: Hierarchical Budget Enforcement

**What:** Budget limits at org → team → user level
**When:** Enforcing spend limits across organizational hierarchy
**Example:**

```typescript
interface BudgetConfig {
  orgId: string;
  monthlyLimit: number;
  teamLimits: Map<string, number>;
  userLimits: Map<string, number>;
  currentSpend: number;
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: No Circuit Breakers

**What:** Blindly retry failing provider until timeout
**Why bad:** Wastes rate limits on failing provider, causes cascading latency
**Instead:** Open circuit after threshold, fail fast, route to fallback

### Anti-Pattern 2: Treat All Errors Identically

**What:** Retry everything the same way
**Why bad:** Context overflow (400) will fail on any similar model; rate limit (429) needs different handling than outage (503)
**Instead:** Classify errors, route differently based on type

### Anti-Pattern 3: No Retry Budget

**What:** Unlimited retries per request
**Why bad:** Nested LLM calls + multiple workers + retries = exponential cost explosion ($400 overnight scenario)
**Instead:** Global retry budget per request chain, cost ceiling per minute

### Anti-Pattern 4: Exact-Match Caching Only

**What:** Cache only exact request matches
**Why bad:** Misses cache opportunities for semantically similar prompts
**Instead:** Consider semantic caching with embedding similarity (higher complexity)

## Scalability Considerations

| Concern          | At 100 users          | At 10K users        | At 1M users                    |
| ---------------- | --------------------- | ------------------- | ------------------------------ |
| Rate limiting    | Redis single instance | Redis cluster       | Redis cluster with sharding    |
| Circuit breakers | In-memory             | Redis-backed state  | Distributed state              |
| Caching          | Local + Redis         | Redis cluster       | Redis cluster + semantic layer |
| Observability    | Logging               | Metrics aggregation | Distributed tracing            |
| Fallback chains  | Simple priority       | Health scoring      | Adaptive routing               |

---

# Domain Pitfalls

**Domain:** Enterprise LLM API Gateway
**Researched:** 2026-03-23

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: No Retry Budget / Cost Containment

**What goes wrong:** $400 overnight billing from retry loops
**Why it happens:** Nested LLM calls (agent tool invocations) + multiple workers + individual retry limits = exponential retry attempts
**Consequences:** Uncontrolled costs, budget enforcement bypassed
**Prevention:** Implement global retry budget per request chain, track total retries across nested calls, cost ceiling per time window
**Detection:** Monitor `total_retries` and `total_cost` per trace/request; alert on budget threshold

### Pitfall 2: Treating All Errors Identically

**What goes wrong:** Context overflow (400) triggers retries that will fail on any same-context model
**Why it happens:** No error classification, all errors treated as transient
**Consequences:** Wasted retries, latency spike, eventual fallback to larger-context model fails same way
**Prevention:** Classify errors:

- Retry immediately: 408, 429 (with backoff), 500, 502, 503, 504
- Skip to fallback: 503 (prolonged), content policy violations
- Fail immediately: 400 (context overflow), 401, 403
  **Detection:** Track error type distribution, alert on unexpected error patterns

### Pitfall 3: No Circuit Breakers During Provider Outages

**What goes wrong:** Continue hammering failing provider, exhausting rate limits, causing latency spike
**Why it happens:** No failure rate tracking per provider
**Consequences:** Cascading latency, wasted quota, user-facing timeouts
**Prevention:** Implement circuit breaker per provider:

- Open after N consecutive failures OR M% failures in sliding window
- Reject requests immediately when open (fail fast)
- Test recovery with limited requests in half-open state
  **Detection:** Monitor circuit breaker state transitions, alert on open state

## Moderate Pitfalls

### Pitfall 4: Silent Fallback Behavior Shift

**What goes wrong:** Fallback to different model produces noticeably different responses
**Why it happens:** No model parity validation, fallback triggers without awareness of capability differences
**Consequences:** User experience degradation, inconsistent responses
**Prevention:** Define model compatibility groups, log fallback events with response diff
**Detection:** Track fallback rate per model, alert on elevated rates

### Pitfall 5: Inadequate Observability

**What goes wrong:** Can't diagnose latency spikes, cost anomalies, or quality issues
**Why it happens:** Request logs only, no metrics histograms, no distributed tracing
**Consequences:** Firefighting without data, slow mean-time-to-resolution
**Prevention:** Add:

- Latency histograms (P50, P95, P99)
- Error rate by type
- Cost per org/team/model
- Fallback frequency tracking
  **Detection:** Create dashboards for each metric category

## Minor Pitfalls

### Pitfall 6: Hardcoded Provider Priority

**What goes wrong:** Can't adapt to changing provider conditions
**Why it happens:** Static fallback order, no health scoring
**Prevention:** Implement dynamic provider scoring based on latency, error rate, cost

### Pitfall 7: Ignoring Retry-After Headers

**What goes wrong:** Retry timing doesn't align with rate limit reset
**Why it happens:** Fixed backoff, ignoring provider guidance
**Prevention:** Parse and respect `Retry-After` header from 429 responses

## Phase-Specific Warnings

| Phase Topic             | Likely Pitfall                     | Mitigation                                             |
| ----------------------- | ---------------------------------- | ------------------------------------------------------ |
| Reliability Engineering | Retry loops causing cost explosion | Implement retry budgets, track total retries per trace |
| Fallback Implementation | Silent behavior shift on fallback  | Log fallback events, track model parity                |
| Observability           | Metrics without actionable alerts  | Define SLOs, alert on deviation                        |
| Smart Routing           | Complex routing causing latency    | Benchmark routing overhead, optimize hot path          |

---

# Sources

1. **Enterprise AI Gateways in 2026 (Dev.to, 2026-02-27)** — Industry overview of enterprise gateway capabilities and market
2. **Best Enterprise LLM Gateways in 2026 (Maxim AI, 2026-03-03)** — Comparative analysis of Bifrost, LiteLLM, Cloudflare, Kong
3. **LLM API Gateway Patterns for Multi-Model Orchestration (Reintech, 2025-12-31)** — Core architectural patterns including unified interface, smart routing, circuit breakers
4. **AI Gateway Deep Dive (Jimmy Song, 2025-06-29)** — Comprehensive architecture guidance for security, routing, observability
5. **Build an LLM Fallback Chain: Multi-Provider Reliability Pattern (Markaicode, 2026-03-14)** — Production fallback implementation
6. **AI Agent Resilience Patterns Guide (AI Workflow Lab, 2026-03-01)** — Defense-in-depth architecture with retries, fallbacks, circuit breakers
7. **Building Reliable LLM Pipelines (Substack, 2026-02-09)** — Error handling patterns that work in production
8. **Provider Fallbacks: Ensuring LLM Availability (Statsig, 2025-10-31)** — Fallback design patterns
9. **LLM Gateway: Control Plane for AI Applications (Substack, 2026-02-15)** — Gateway architecture overview
10. **Enterprise LLM Architecture Blueprint (Web Pulses, 2026-03-07)** — Six-layer enterprise architecture model

---

_Last updated: 2026-03-23_

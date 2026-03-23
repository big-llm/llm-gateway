# Pitfalls Research

**Domain:** LLM Gateway / API Proxy
**Researched:** 2026-03-23
**Confidence:** HIGH

## Executive Summary

This research identifies critical pitfalls when enhancing an existing LLM API gateway. The most dangerous mistakes involve **streaming infrastructure** (proxy timeouts silently killing long responses), **cross-tenant data leakage** (cache keys without tenant prefixes), and **budget enforcement failures** (race conditions in spend tracking). These issues often hide in production until triggered by load or specific provider behavior.

---

## Critical Pitfalls

### Pitfall 1: Streaming Connections Killed by Infrastructure Timeouts

**What goes wrong:**
Long-running LLM responses (reasoning models, complex tool use) fail mid-stream with 504 Gateway Timeout or connection hang. Users see partial responses or silent failures.

**Why it happens:**

- Load balancers, reverse proxies, and CDNs have default idle timeouts (30-60 seconds) shorter than LLM generation time
- Nginx/Cloudflare buffer SSE responses by default, coalescing chunks and defeating streaming
- Worker threads block for entire response duration, exhausting available workers under load

**How to avoid:**

1. **Disable proxy buffering explicitly:**
   ```
   Nginx: proxy_buffering off; X-Accel-Buffering: no
   Cloudflare: Disable response buffering for streaming endpoints
   AWS ALB: Set idle timeout to 300+ seconds
   ```
2. **Implement heartbeat comments:** Send `": heartbeat\n\n"` every 15 seconds during model "thinking" pauses to prevent idle timeout triggers
3. **Use async worker pool:** Ensure web server can handle long-lived connections without blocking (Node.js event loop is generally safe; watch Python frameworks)
4. **Extend all timeout settings:** `proxy_read_timeout`, `proxy_send_timeout`, `keepalive_timeout` to 300s minimum

**Warning signs:**

- Streaming works in local/staging but fails in production
- Errors appear only on longer prompts or complex reasoning tasks
- Load balancer logs show 504 errors during LLM response generation
- Concurrent streaming requests > 8 causes failures (worker exhaustion pattern)

**Phase to address:** Streaming Pipeline Enhancement (Phase 2)

---

### Pitfall 2: Cross-Tenant Data Leakage via Cache Keys

**What goes wrong:**
Tenant A's cached LLM response is served to Tenant B. Sensitive data from one tenant appears in another tenant's requests.

**Why it happens:**

- Redis cache keys missing tenant prefix (e.g., `cache:gpt4:hash` instead of `tenant_123:cache:gpt4:hash`)
- In-memory cache shared across tenants without isolation
- Lookup logic that forgets to validate tenant_id before returning cached response

**How to avoid:**

1. **Prefix all cache keys with tenant identifier:** `cache_key = f"{tenant_id}:cache:{model}:{hash(messages)}"`
2. **Validate tenant context before cache return:** Always check `returned_tenant_id === request_tenant_id`
3. **Separate cache namespaces:** Use Redis ACLs or separate databases per tenant for sensitive workloads
4. **Add cache isolation tests:** Verify Tenant A cannot receive Tenant B's cached responses

**Warning signs:**

- Users report seeing other tenants' data in responses
- Cache hit rates suspiciously high for diverse requests
- No tenant_id in cache key logging
- Memory cache growth without per-tenant accounting

**Phase to address:** Multi-Tenant Security Hardening (Phase 1)

---

### Pitfall 3: Budget Race Conditions in Spend Tracking

**What goes wrong:**
Concurrent requests complete simultaneously, causing budget under-counting or over-counting. Organizations exceed budgets silently or get incorrectly blocked.

**Why it happens:**

- Non-atomic database increments (read current spend, add cost, write back)
- Missing transactions around multi-step budget checks
- Race between "check budget" and "record spend" (spending happens but budget check passed incorrectly)
- `as any` casts hiding broken code patterns (visible in CONCERNS.md line 337)

**How to avoid:**

1. **Use atomic database increments:** Drizzle's `.increment()` or SQL `UPDATE ... SET spend = spend + :amount`
2. **Wrap check-and-spend in transactions:** Single atomic operation for budget validation + recording
3. **Implement optimistic locking:** Version field on budget record, retry on conflict
4. **Add budget consistency verification:** Periodic audit comparing recorded spend vs. actual provider usage

**Warning signs:**

- CONCERNS.md flags `db.select().then()` pattern in usage recording (line 328-339)
- Budget discrepancies discovered after month-end billing
- Multiple concurrent requests to same org/team cause failures
- No transaction around budget check in `recordUsage`

**Phase to address:** Budget Enforcement Enhancement (Phase 1)

---

### Pitfall 4: Provider Fallback Creates Retry Loops

**What goes wrong:**
Primary provider fails, gateway falls back to secondary, secondary also fails (rate limit, bad request), fallback loops endlessly or returns error without proper classification.

**Why it happens:**

- Error classification maps provider-specific errors incorrectly (429 vs 400 vs 500)
- Retrying on non-retryable errors consumes quota and adds latency
- Fallback chain lacks circuit breaker to stop cascading failures
- No max fallback depth limit — infinite loop between providers

**How to avoid:**

1. **Implement proper error classification per provider:** Map OpenAI 429 → RATE_LIMIT, Anthropic 529 → OVERLOADED, etc.
2. **Whitelist retryable error codes:** Only 429, 500, 502, 503, 504, TIMEOUT, NETWORK
3. **Add circuit breaker:** Track failure rate per provider, stop routing to unhealthy providers for 30-60 seconds
4. **Set max fallback depth:** Hard limit (e.g., 2) to prevent infinite fallback loops

**Warning signs:**

- Latency spikes when primary provider has issues (fallback engaged but slow)
- API quota exhausted from aggressive retries on 400-level errors
- Fallback chain visible in logs as repeated "primary failed, trying secondary" without resolution
- No circuit breaker implementation visible (CONCERNS.md notes "circuit breaker exists in config but implementation not visible")

**Phase to address:** Reliability & Fallback Enhancement (Phase 2)

---

### Pitfall 5: Token Counting Mismatch Breaks Budgets

**What goes wrong:**
Gateway counts tokens differently than provider billing. Organizations are charged more than budget enforcement allowed, or budgets don't accurately reflect actual spend.

**Why it happens:**

- Different tokenizers used locally vs. provider (tiktoken vs. provider's count)
- System prompt tokens not counted in user-facing budget but billed by provider
- Caching adds extra tokens but local count doesn't account for cached tokens
- Streaming responses: counting during generation vs. final count differs

**How to avoid:**

1. **Prefer provider-side token counting:** Use provider's reported token counts in usage logs, not local estimation
2. **Implement token counting validation:** Compare local estimate vs. provider reported, investigate >10% variance
3. **Account for caching in budgets:** Mark cached tokens differently in usage tracking
4. **Use provider SDKs for accurate counts:** OpenAI/Anthropic SDKs return actual token usage in response

**Warning signs:**

- Budget reports show 20-30% variance from actual provider invoices
- System prompt appears in usage logs but not budget calculation
- Cache-enabled requests show same token count as non-cached (incorrect)
- No token_count field in provider response being captured

**Phase to address:** Analytics & Token Tracking Enhancement (Phase 3)

---

### Pitfall 6: Rate Limiter Uses O(n) Redis Operations

**What goes wrong:**
Rate limiting uses `redis.keys()` which scans entire keyspace — O(n) operation that blocks Redis. Under load, this becomes a DoS vector against the rate limiter itself.

**Why it happens:**

- Using `KEYS` pattern for finding rate limit keys (seen in CONCERNS.md line 112)
- Not using Redis data structures designed for rate limiting (sorted sets, sliding window)
- Each request triggers full keyspace scan

**How to avoid:**

1. **Use Redis SCAN instead of KEYS:** `SCAN` is O(1) per iteration, doesn't block
2. **Use sorted sets for sliding window:** Store timestamps in sorted set, count entries in time range
3. **Pre-compute key names:** Use deterministic key naming (`rate_limit:user_id:minute_12`) instead of pattern matching
4. **Consider Redis Lua scripts:** Atomic operations for rate limit check + increment

**Warning signs:**

- Redis CPU spikes correlate with request volume
- Rate limiter adds 50-100ms latency per request
- Redis slow log shows KEYS or pattern matching commands
- CONCERNS.md flags KEYS usage (line 112)

**Phase to address:** Rate Limiting Enhancement (Phase 1)

---

### Pitfall 7: Multi-Tenant Rate Limit Isolation Missing

**What goes wrong:**
One tenant's runaway script exhausts shared provider rate limits, affecting all tenants. No per-tenant isolation means noisy neighbor problem.

**Why it happens:**

- Rate limiting only at provider level, not per-tenant
- Single provider API key shared across all tenants
- No token bucket per tenant, per feature
- Tenant A's abuse blocks Tenant B's requests

**How to avoid:**

1. **Implement per-tenant rate limit buckets:** Each tenant gets independent limit tracked in Redis
2. **Isolate provider API keys per tenant or pool:** Avoid single key shared across tenants
3. **Add provider-level circuit breaker:** If tenant exceeds threshold, isolate that tenant from provider
4. **Implement fair queuing:** When provider limits reached, queue requests fairly across tenants

**Warning signs:**

- One tenant's high traffic causes 429 errors for all tenants
- Rate limit headers don't show tenant-level limits
- No per-tenant rate limit configuration in admin UI
- Provider rate limit errors don't identify which tenant caused them

**Phase to address:** Rate Limiting Enhancement (Phase 1)

---

### Pitfall 8: Admin Token Vulnerable to Timing Attacks

**What goes wrong:**
Admin token comparison uses simple string equality (`token !== adminToken`) — vulnerable to timing attack where attacker guesses token byte-by-byte.

**Why it happens:**

- String comparison stops at first wrong character (different execution time)
- Fastify/Node.js default string comparison not constant-time
- No crypto constant-time comparison used

**How to avoid:**

1. **Use crypto.timingSafeEqual():**
   ```typescript
   import { timingSafeEqual } from 'crypto';
   const safe = timingSafeEqual(Buffer.from(token), Buffer.from(adminToken));
   ```
2. **Add constant-time comparison for all secrets:** API keys, encryption keys, HMAC secrets
3. **Implement token length validation:** Reject obviously invalid lengths early

**Warning signs:**

- CONCERNS.md flags timing attack vulnerability (line 65-68)
- Code uses `===` or `!==` for secret comparisons
- No constant-time comparison utilities in codebase
- Security scan flags timing vulnerabilities

**Phase to address:** Security Hardening (Phase 1)

---

### Pitfall 9: Streaming Errors Leave Connections Stuck

**What goes wrong:**
Provider times out mid-stream or connection drops. Client receives partial response with no indication of failure. Connection stays open indefinitely.

**Why it happens:**

- No cleanup on stream error — connection not explicitly closed
- Error events not fully handled in SSE response
- Client doesn't reconnect with proper state recovery
- No final chunk signaling end of stream after error

**How to avoid:**

1. **Always close response on provider error:** `res.end()` or send error event before closing
2. **Add error event to SSE stream:** `data: {"error": "timeout"}\n\n` before terminating
3. **Implement client reconnection with offset:** Resume from last-received token (requires offset tracking)
4. **Set client-side abort timer:** Hard timeout to prevent infinite hang

**Warning signs:**

- CONCERNS.md flags streaming error paths as test coverage gap (line 201-206)
- Event translator has many `return null` cases silently dropping events
- No error event sent in SSE stream when provider fails
- Clients report "hung" connections after provider timeout

**Phase to address:** Streaming Pipeline Enhancement (Phase 2)

---

### Pitfall 10: Dynamic Content Breaks Prompt Caching

**What goes wrong:**
Prompt caching stops working — cache hit rate drops to 0%. Costs increase 10x because every request recomputes from scratch.

**Why it happens:**

- Dynamic values injected into system prompt (timestamps, session IDs, `add_datetime_to_instructions=True`)
- Slightly different request prefixes between turns (prompt caching requires identical prefix)
- Tool definitions changed between requests (also part of prompt structure)
- Cache key includes runtime-only data (user_id in cache key instead of request content hash)

**How to avoid:**

1. **Keep system prompt static:** No timestamps, session variables, or dynamic metadata in system/instructions
2. **Separate static from dynamic:** Tool definitions in system (cached), user messages contain runtime data
3. **Use content hash for cache key:** `hash(prompt + messages)` not including tenant_id as key component
4. **Test cache hit rates:** Monitor cache hit ratio, alert on sudden drops

**Warning signs:**

- Cache hit rate suspiciously low (<10%) despite repeated similar queries
- Costs spike without traffic increase
- System prompt includes dynamic content (seen in CONCERNS.md as protocol mapping gaps)
- No cache hit rate monitoring in analytics

**Phase to address:** Caching Enhancement (Phase 2)

---

## Technical Debt Patterns

| Shortcut                                   | Immediate Benefit  | Long-term Cost                      | When Acceptable                            |
| ------------------------------------------ | ------------------ | ----------------------------------- | ------------------------------------------ |
| Use `as any` cast to bypass type errors    | Faster development | Runtime bugs, hidden failures       | Never — fix types properly                 |
| Skip transaction for budget check          | Simpler code       | Race conditions, inaccurate budgets | Never — transactions required              |
| Use `redis.keys()` for rate limiting       | Easy to implement  | Redis blocking, poor scaling        | Never — use SCAN or sorted sets            |
| Hardcode provider fallback order           | Quick to ship      | Can't adapt to provider health      | Only in MVP                                |
| Skip JSON schema validation on admin input | Faster endpoints   | DoS via large payloads              | Never — add Fastify schema validation      |
| Log without redaction                      | Easier debugging   | Credential leakage in logs          | Never — implement sensitive data redaction |

---

## Integration Gotchas

| Integration   | Common Mistake                          | Correct Approach                                                 |
| ------------- | --------------------------------------- | ---------------------------------------------------------------- |
| OpenAI API    | Not handling response format variations | Validate response schema, handle missing fields gracefully       |
| Anthropic API | Ignoring cache_control parameter        | Document limitation, implement when provider supports equivalent |
| Redis         | Using KEYS command in production        | Use SCAN, sorted sets, or deterministic key naming               |
| SQLite        | Sequential queries in hot path          | Use transactions, batch operations                               |
| Fastify       | No JSON payload size limits             | Add schema validation with max size                              |

---

## Performance Traps

| Trap                                     | Symptoms                                 | Prevention                                  | When It Breaks                              |
| ---------------------------------------- | ---------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| Worker thread exhaustion                 | Streaming fails at 8-10 concurrent users | Use async/Node.js event loop or thread pool | At 10+ concurrent long-streaming requests   |
| Redis KEYS scan                          | Latency spikes to 500ms+                 | Use SCAN or pre-computed keys               | At 1000+ rate limit keys                    |
| Sequential DB queries in usage recording | 100ms+ added latency per request         | Batch in single transaction                 | At 100+ requests/second                     |
| Streaming response buffering             | Tokens arrive in batches, not stream     | Disable buffering at proxy level            | Behind Nginx/Cloudflare/ALB                 |
| Memory cache unbounded growth            | Process OOM                              | Add max size + LRU eviction                 | At high traffic with large cached responses |

---

## Security Mistakes

| Mistake                           | Risk                          | Prevention                                 |
| --------------------------------- | ----------------------------- | ------------------------------------------ |
| Timing-based token comparison     | Token theft via timing attack | Use crypto.timingSafeEqual                 |
| API keys in log output            | Credential leakage            | Implement redaction in logger              |
| No input sanitization on admin    | DoS via large payloads        | Fastify schema validation with size limits |
| Scrypt with default parameters    | Weak key derivation           | Use Argon2 or tune scrypt params           |
| Cache keys without tenant prefix  | Cross-tenant data leak        | Prefix all cache keys with tenant_id       |
| Missing tenant context in queries | Data leakage via SQL          | Use Drizzle with explicit tenant filters   |

---

## UX Pitfalls

| Pitfall                              | User Impact                        | Better Approach                        |
| ------------------------------------ | ---------------------------------- | -------------------------------------- |
| No rate limit headers                | Can't adapt proactively            | Return X-RateLimit-\* headers          |
| Silent fallback to slower model      | Unexpected response quality change | Notify client when fallback occurs     |
| Generic error messages               | Can't debug what went wrong        | Include error context in response      |
| Budget exceeded with no notification | Requests fail without explanation  | Return clear error with budget details |

---

## "Looks Done But Isn't" Checklist

- [ ] **Budget enforcement:** Often missing automatic budget reset at period end — verify `budgetResetAt` is enforced automatically
- [ ] **Rate limiting:** Often missing per-tenant rate limits — verify tenant isolation in rate limiter
- [ ] **Streaming:** Often missing heartbeat for long responses — verify heartbeat implementation
- [ ] **Circuit breaker:** Often missing actual implementation (not just config) — verify circuit breaker code exists
- [ ] **Cache isolation:** Often missing tenant prefix in cache keys — verify cache key format
- [ ] **Token counting:** Often using local estimate instead of provider count — verify provider token counts used
- [ ] **Error classification:** Often mapping errors incorrectly per provider — verify error mapping for each provider

---

## Recovery Strategies

| Pitfall                        | Recovery Cost | Recovery Steps                                                                         |
| ------------------------------ | ------------- | -------------------------------------------------------------------------------------- |
| Cross-tenant cache leak        | HIGH          | Immediate: flush all caches. Audit: add tenant isolation. Notify affected tenants      |
| Budget race condition          | MEDIUM        | Reconcile actual vs. recorded spend. Fix increment logic. Refund/charge corrections    |
| Streaming timeout mid-response | LOW           | Client reconnection with last-seen offset. Add heartbeat to prevent future occurrences |
| Rate limit DoS via KEYS        | MEDIUM        | Switch to SCAN. Add Redis monitoring. Restore from backup if data loss                 |

---

## Pitfall-to-Phase Mapping

| Pitfall                   | Prevention Phase               | Verification                                         |
| ------------------------- | ------------------------------ | ---------------------------------------------------- |
| Cross-tenant data leakage | Phase 1: Multi-Tenant Security | Cache keys have tenant prefix, test tenant isolation |
| Budget race conditions    | Phase 1: Budget Enforcement    | Atomic increments, transaction wrapping              |
| Admin timing attack       | Phase 1: Security Hardening    | Use timingSafeEqual, security audit                  |
| Rate limiter O(n)         | Phase 1: Rate Limiting         | Use SCAN or sorted sets, benchmark at scale          |
| Streaming timeouts        | Phase 2: Streaming Pipeline    | Disable buffering, add heartbeats, load test         |
| Fallback retry loops      | Phase 2: Reliability           | Circuit breaker, max depth, error classification     |
| Token counting mismatch   | Phase 3: Analytics             | Compare local vs. provider counts                    |
| Prompt cache break        | Phase 2: Caching               | Monitor cache hit rate, keep prompts static          |

---

## Sources

- CONCERNS.md codebase analysis (lines 15-228): Identified existing issues in usage recording, cache, rate limiting, streaming
- "LLM Integration in Enterprise Applications: Patterns and Pitfalls" (James Ross Jr., 2026-03-03): Cost modeling, context window, prompt versioning
- "Best Infrastructure for Streaming LLM Responses" (Aditya Somani, 2026-02-16): Proxy buffering, idle timeouts, heartbeat pattern
- "Multi-Tenant LLM SaaS Architecture: Isolating Prompts, Costs, and Rate Limits" (Markaicode, 2026-03-02): Tenant isolation patterns, Redis key prefixing
- "Fix LLM API Timeout Errors in Production" (Markaicode, 2026-02-21): Timeout configuration, retry logic
- "LLM Gateways 2026: Mission-Critical Production AI Guide" (Iterathon, 2025-12-23): Gateway reliability, cost control
- "Error Handling & Resilience for LLM Applications" (Enrico Piovano, 2025-12-07): Retry strategies, circuit breakers
- "Why Your LLM Costs Are Exploding: Prompt Caching Mistake" (Pankti Shah, 2026-03-19): Static-first ordering, cache key design

---

_Pitfalls research for: LLM Gateway_
_Researched: 2026-03-23_

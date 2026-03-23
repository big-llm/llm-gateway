# Codebase Concerns

**Analysis Date:** 2026-03-23

## Tech Debt

**Config Loading Pattern (src/config/index.ts):**

- Issue: `configPromise` is cast to `unknown as Config` (line 113) - This circumvents type safety and could lead to runtime errors if config isn't properly loaded
- Files: `src/config/index.ts`
- Impact: Config may be undefined if accessed before initialization completes
- Fix approach: Use a proper async initialization pattern or ensure synchronous loading

**Usage Recording Race Condition (src/services/tenancy/index.ts):**

- Issue: Lines 328-339 use a non-standard pattern with `db.select().then()` that likely doesn't await properly. The `as any` cast on line 337 indicates this is known problematic code
- Files: `src/services/tenancy/index.ts`
- Impact: Budget tracking may be inaccurate - spend might not be recorded correctly
- Fix approach: Use Drizzle's proper increment pattern or transaction-based updates

**Memory Cache Unbounded Growth (src/services/cache.ts):**

- Issue: `memoryCache` Map has no size limit - entries are only cleaned via periodic cleanup but could accumulate between cleanups
- Files: `src/services/cache.ts`
- Impact: Memory usage grows with traffic
- Fix approach: Add max cache size with LRU eviction

**Duplicate Code in Request Adapter:**

- Issue: `normalizeAnthropicRequest` and `convertToProviderRequest` contain nearly identical logic (lines 24-59 and 451-481)
- Files: `src/adapters/request.ts`
- Impact: Maintenance burden and potential inconsistencies
- Fix approach: Refactor to use shared internal functions

## Known Limitations

**Protocol Mapping Gaps (from README.md):**

- Issue: Anthropic cache control has no OpenAI equivalent
- Files: Documented in `README.md` (line 319)
- Impact: Caching strategies cannot be passed through
- Fix approach: Document this limitation clearly in API responses

**Anthropic top_k Parameter:**

- Issue: No OpenAI equivalent exists
- Impact: Parameter is silently dropped during translation

**Stop Sequences Mapping:**

- Issue: Limited mapping to OpenAI `stop` parameter
- Files: `src/adapters/request.ts`
- Impact: Some stop sequences may not work correctly

**Provider-Specific Streaming Limitations:**

- Issue: Tool streaming support varies by provider (Ollama doesn't support tools)
- Impact: Different behavior depending on provider
- Fix approach: Implement provider capability detection

## Security Considerations

**Timing-Sensitive Admin Token Comparison (src/admin/middleware.ts):**

- Issue: Line 38 uses `token !== adminToken` - simple string comparison is vulnerable to timing attacks
- Files: `src/admin/middleware.ts`
- Risk: Attacker could guess admin token via timing analysis
- Recommendations: Use constant-time comparison (e.g., `crypto.timingSafeEqual`)

**API Key Encryption Key Derivation (src/services/tenancy/index.ts):**

- Issue: Line 201 uses `scrypt` with default parameters - salt is stored in the result but iteration count and memory cost are not explicitly set
- Files: `src/services/tenancy/index.ts`
- Risk: Password hashing may be insufficient for sensitive credentials
- Recommendations: Use Argon2 or increase scrypt parameters

**No Input Sanitization on Admin Endpoints:**

- Issue: Admin API accepts JSON without explicit length limits or payload sanitization
- Files: `src/admin/*.ts`
- Risk: Could accept overly large payloads leading to DoS
- Recommendations: Add Fastify JSON schema validation with size limits

**Provider Credentials in Logs:**

- Issue: No redaction of API keys in log output (if LOG_LEVEL=debug)
- Files: General logging configuration
- Risk: Credential leakage in logs
- Recommendations: Implement sensitive data redaction in logger

## Performance Bottlenecks

**Rate Limiter Redis KEYS Command (src/services/rate-limit/index.ts):**

- Issue: Line 112 uses `redis.keys()` which scans entire keyspace - O(n) operation
- Files: `src/services/rate-limit/index.ts`
- Cause: KEYS command blocks Redis and doesn't scale
- Improvement path: Use SCAN instead or maintain separate set for tracking

**Multiple Sequential Database Queries in Usage Recording:**

- Issue: `recordUsage` makes 5+ sequential database queries (lines 328-380)
- Files: `src/services/tenancy/index.ts`
- Cause: No batch operations or transactions
- Impact: High latency for usage tracking
- Improvement path: Use Drizzle transactions to batch updates

**Streaming Event Translation Parsing:**

- Issue: Each SSE line triggers JSON parsing with no chunking optimization
- Files: `src/adapters/request.ts`, `src/streaming/event-translator.ts`
- Impact: Slower streaming performance
- Improvement path: Pre-compile parsers or use streaming JSON library

## Fragile Areas

**Streaming Event Translator (src/streaming/event-translator.ts):**

- Files: `src/streaming/event-translator.ts`
- Why fragile: Many `return null` cases silently fail - no logging when events are dropped
- Safe modification: Add logging when returning null to debug issues
- Test coverage: Limited testing visible

**OpenAI Response Denormalization (src/adapters/request.ts):**

- Files: `src/adapters/request.ts`
- Why fragile: Assumes specific OpenAI response structure - any variant causes silent failures
- Safe modification: Add validation and error handling for unexpected response formats
- Test coverage: Could benefit from more edge case testing

**Provider Error Classification (src/providers/errors.ts):**

- Files: `src/providers/errors.ts`
- Why fragile: Uses type assertions that could fail silently
- Safe modification: Add defensive type checking

## Scaling Limits

**In-Memory Cache:**

- Current capacity: Unlimited (bounded only by available memory)
- Limit: Process memory exhaustion under high load
- Scaling path: Rely entirely on Redis or implement process memory limits

**SQLite Database:**

- Current capacity: Single-node SQLite
- Limit: Write contention under high concurrent load
- Scaling path: Migrate to PostgreSQL when multi-instance deployment needed

**Rate Limiter - Redis-Dependent:**

- Current capacity: Redis backend required for true rate limiting
- Limit: If Redis unavailable, unlimited access (graceful degradation allows requests)
- Scaling path: Implement in-memory fallback with less accurate limiting

## Dependencies at Risk

**Drizzle ORM (drizzle-orm):**

- Risk: Version 0.45.x is relatively old, may have bugs with complex queries
- Impact: Usage recording may fail silently
- Migration plan: Upgrade to latest version and verify usage patterns

**Better-SQLite3:**

- Risk: Native module requires rebuild on Node version changes
- Impact: Build failures after Node upgrades
- Migration plan: Consider switching to `sql.js` or `libsql` for better cross-platform

**Pino Logging:**

- Risk: Pretty logging mode uses external package that may have security issues
- Impact: Debug mode may be vulnerable
- Migration plan: Use structured logging instead

## Missing Critical Features

**Model Debouncing:**

- Problem: No debounce when provider model mapping is not configured
- Blocks: Users get errors instead of fallback behavior

**Circuit Breaker Health Check Integration:**

- Problem: Circuit breaker exists in config but implementation not visible
- Blocks: Automatic failover when provider is unhealthy

**Automatic Budget Reset:**

- Problem: `budgetResetAt` is stored but not enforced automatically
- Blocks: Budget enforcement requires manual intervention

**Rate Limit Headers:**

- Problem: Default rate limit returns broad success, no headers indicating limits
- Blocks: Clients can't adapt to rate limits proactively

## Test Coverage Gaps

**Streaming Error Paths:**

- What's not tested: How streaming handles provider timeouts mid-stream
- Files: `src/streaming/pipeline.ts`
- Risk: Connection drops could leave stuck connections
- Priority: High

**Provider Fallback Behavior:**

- What's not tested: How the system fails over when primary provider returns certain error types
- Files: `src/providers/`, `src/core/pipeline.ts`
- Risk: Fallback may not engage correctly
- Priority: High

**Concurrent Budget Updates:**

- What's not tested: Race conditions when multiple requests complete simultaneously
- Files: `src/services/budget.ts`, `src/services/tenancy/index.ts`
- Risk: Budget under/over counting
- Priority: Medium

**Admin API Authentication:**

- What's not tested: All edge cases around admin token validation
- Files: `src/admin/middleware.ts`
- Risk: Bypass vulnerabilities
- Priority: Medium

---

_Concerns audit: 2026-03-23_

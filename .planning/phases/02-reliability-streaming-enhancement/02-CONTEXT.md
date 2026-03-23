# Phase 2: Reliability & Streaming Enhancement - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Ensure streaming requests stay connected without timeout failures. Long-running LLM responses can take 60+ seconds, but infrastructure proxies often timeout idle connections at 30-60 seconds. This phase implements SSE heartbeats and connection recovery to prevent premature disconnection.

</domain>

<decisions>
## Implementation Decisions

### Error Recovery

- **D-01:** On stream connection drop, attempt reconnect with exponential backoff before failing
- **D-02:** Maximum 3 reconnect attempts (1s, 2s, 4s intervals)
- **D-03:** After 3 failures, return error to client (fail fast)
- **D-04:** On reconnect, do full stream restart (client deduplicates) — no resume from last event

### Heartbeat Format

- **D-05:** Use SSE comment format `: heartbeat` — invisible to clients, standard pattern
- **D-06:** Default heartbeat interval: 10 seconds (conservative, safe for any proxy)
- **D-07:** Heartbeat sent only when no data received for interval duration

### Configuration Scope

- **D-08:** Heartbeat interval configurable per-provider with global default
- **D-09:** Environment variable: `SSE_HEARTBEAT_INTERVAL_MS` (global default)
- **D-10:** Provider config can override with `heartbeatIntervalMs` field

### Proxy Headers

- **D-11:** Set `X-Accel-Buffering: no` header on all streaming responses (disables nginx buffering)
- **D-12:** Set `Cache-Control: no-cache` on streaming responses (existing pattern)

### Agent's Discretion

- Exact implementation of heartbeat timer (interval vs timeout)
- How to track "no data received" for heartbeat trigger
- Error message format for stream failures

</decisions>

<specifics>
## Specific Ideas

- "10 seconds is conservative, safe for any proxy timeout configuration"
- SSE comment format is the standard approach — clients don't need to handle it
- Full restart on reconnect is simpler and more reliable than resume

</specifics>

<canonical_refs>

## Canonical References

### Reliability & Streaming

- `.planning/research/PITFALLS.md` — Pitfall #1: Streaming timeout failures, prevention strategies
- `.planning/research/SUMMARY.md` — Phase 2 recommendations for streaming reliability

### Existing Implementation

- `src/core/pipeline.ts` — `streamFromProvider()` function (needs heartbeat + reconnect)
- `src/routes/messages.ts` — Streaming endpoint `/messages/stream`
- `src/routes/chat-completions.ts` — Streaming mode handling
- `src/config/index.ts` — Provider configuration loading

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `streamFromProvider()` in `src/core/pipeline.ts` — Core streaming logic, needs heartbeat injection
- Provider timeout config (`timeoutMs`) — Already exists, can add `heartbeatIntervalMs`
- `PipelineOptions` interface — Can extend with streaming options

### Established Patterns

- Streaming uses SSE format via Fastify reply
- Timeout handling via `AbortController` and `setTimeout`
- Provider config loaded from environment variables

### Integration Points

- `src/routes/messages.ts:340` — `/messages/stream` endpoint
- `src/routes/chat-completions.ts:134` — Stream mode handling
- `src/core/pipeline.ts:399` — `streamFromProvider()` function

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 02-reliability-streaming-enhancement_
_Context gathered: 2026-03-23_

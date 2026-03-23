# Phase 2: Reliability & Streaming Enhancement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-23
**Phase:** 02-reliability-streaming-enhancement
**Areas discussed:** Error recovery, Heartbeat format, Configuration scope

---

## Error Recovery

| Option                       | Description                                           | Selected |
| ---------------------------- | ----------------------------------------------------- | -------- |
| Fail fast                    | Log and return error to client, let them decide       |          |
| Reconnect then fail          | Attempt reconnect with exponential backoff, then fail | ✓        |
| Fallback to another provider | Try fallback provider on stream failure               |          |

**User's choice:** Reconnect then fail

---

## Reconnect Attempts

| Option            | Description                       | Selected |
| ----------------- | --------------------------------- | -------- |
| 3 retries         | 1s, 2s, 4s with max 3 retries     | ✓        |
| 5 retries         | 1s, 2s, 4s, 8s with max 5 retries |          |
| Minimal (1 retry) | Single retry after 2s             |          |

**User's choice:** 3 retries with exponential backoff

---

## Stream Resume Strategy

| Option                 | Description                                          | Selected |
| ---------------------- | ---------------------------------------------------- | -------- |
| Resume from last event | Resume from last received event if provider supports |          |
| Full restart           | Start fresh stream, client deduplicates              | ✓        |

**User's choice:** Full restart (simpler, more reliable)

---

## Heartbeat Format

| Option           | Description                                               | Selected |
| ---------------- | --------------------------------------------------------- | -------- |
| Comment event    | SSE comment ': heartbeat' — invisible to clients          | ✓        |
| Named ping event | Named event 'event: ping' — visible but explicit          |          |
| JSON data event  | Custom 'data: {"type":"heartbeat"}' — parseable by client |          |

**User's choice:** Comment event (standard pattern)

---

## Heartbeat Interval

| Option     | Description                                   | Selected |
| ---------- | --------------------------------------------- | -------- |
| 15 seconds | Safe for 30s infrastructure timeouts          |          |
| 10 seconds | Conservative, safe for any proxy              | ✓        |
| 30 seconds | Minimal overhead, needs longer proxy timeouts |          |

**User's choice:** 10 seconds (conservative)

---

## Configuration Scope

| Option                    | Description                                         | Selected |
| ------------------------- | --------------------------------------------------- | -------- |
| Global only               | Single env var applies everywhere                   |          |
| Per-provider with default | Per-provider setting in config, with global default | ✓        |
| Per-provider type         | Different defaults per provider type                |          |

**User's choice:** Per-provider with default

---

## Environment Variable Name

| Option                       | Description            | Selected |
| ---------------------------- | ---------------------- | -------- |
| SSE_HEARTBEAT_INTERVAL_MS    | Clear, explicit naming | ✓        |
| STREAM_HEARTBEAT_INTERVAL_MS | Alternative naming     |          |

**User's choice:** SSE_HEARTBEAT_INTERVAL_MS

---

## Agent's Discretion

- Exact implementation of heartbeat timer (interval vs timeout)
- How to track "no data received" for heartbeat trigger
- Error message format for stream failures

## Deferred Ideas

None — discussion stayed within phase scope.

# Phase 3: Observability & Provider Health - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 03-observability-provider-health
**Areas discussed:** Health calculation, Thresholds, Calculation window, Latency factor, UI display

---

## Health Calculation (OBS-04)

| Option         | Description                                                         | Selected |
| -------------- | ------------------------------------------------------------------- | -------- |
| Per-request    | Update after each request using rolling window — immediate feedback | ✓        |
| Periodic batch | Recalculate every 30-60 seconds — more efficient for high traffic   |          |
| Hybrid         | Immediate for errors, batch for success rate trends                 |          |

**User's choice:** Per-request (Recommended)
**Notes:** Immediate feedback is simpler to understand and debug

---

## Health Thresholds

| Option    | Description                                                                  | Selected |
| --------- | ---------------------------------------------------------------------------- | -------- |
| 95/80/0%  | ≥95% healthy, 80-94% degraded, <80% unhealthy — standard industry practice   | ✓        |
| 99/95/90% | Stricter: ≥99% healthy, 95-98% degraded, 90-94% stressed, <90% unhealthy     |          |
| 90/70/50% | More lenient: ≥90% healthy, 70-89% degraded, 50-69% stressed, <50% unhealthy |          |

**User's choice:** 95/80/0% (Recommended)
**Notes:** Standard industry practice aligns with common monitoring thresholds

---

## Health Calculation Window

| Option   | Description                                                                     | Selected |
| -------- | ------------------------------------------------------------------------------- | -------- |
| Last 100 | Good balance — enough data for accuracy, recent enough to reflect current state | ✓        |
| Last 50  | More responsive to changes, less historical context                             |          |
| Last 500 | More stable, but slower to detect issues                                        |          |

**User's choice:** Last 100 (Recommended)

---

## Latency Factor

| Option                | Description                                                     | Selected |
| --------------------- | --------------------------------------------------------------- | -------- |
| Yes, degrade on slow  | >5000ms = automatic degraded status even with high success rate | ✓        |
| No, success rate only | Health purely based on success/failure — simpler to understand  |          |

**User's choice:** Yes, degrade on slow (Recommended)
**Notes:** Catches slow provider responses that impact user experience

---

## UI Display (OBS-03)

| Option             | Description                                        | Selected |
| ------------------ | -------------------------------------------------- | -------- |
| Success rate %     | Show % of successful requests in the provider card | ✓        |
| Recent errors list | Show last few error messages per provider          |          |
| Both               | Show both success rate and recent errors           |          |

**User's choice:** Success rate % (Recommended)

---

## Agent's Discretion

- Error message truncation length for UI
- Exact placement of success rate in provider card layout

## Deferred Ideas

No ideas were deferred — all discussion stayed within phase scope

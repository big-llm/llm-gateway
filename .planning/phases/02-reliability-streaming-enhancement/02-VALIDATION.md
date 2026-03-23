---
phase: 02
slug: reliability-streaming-enhancement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                             |
| ---------------------- | --------------------------------- |
| **Framework**          | vitest                            |
| **Config file**        | `vitest.config.ts`                |
| **Quick run command**  | `npm run test:run -- tests/unit/` |
| **Full suite command** | `npm run test:run`                |
| **Estimated runtime**  | ~30 seconds                       |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- tests/unit/streaming/ tests/unit/pipeline.test.ts`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type   | Automated Command                                                   | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ----------- | ------------------------------------------------------------------- | ----------- | ---------- |
| 02-01-01 | 01   | 1    | REL-03      | unit        | `npm run test:run -- tests/unit/config/streaming.test.ts`           | ❌ W0       | ⬜ pending |
| 02-01-02 | 01   | 1    | REL-02      | unit        | `npm run test:run -- tests/unit/routes/streaming-headers.test.ts`   | ❌ W0       | ⬜ pending |
| 02-02-01 | 02   | 1    | REL-01      | unit        | `npm run test:run -- tests/unit/streaming/heartbeat.test.ts`        | ❌ W0       | ⬜ pending |
| 02-02-02 | 02   | 1    | REL-01      | integration | `npm run test:run -- tests/integration/streaming-heartbeat.test.ts` | ❌ W0       | ⬜ pending |
| 02-03-01 | 03   | 2    | REL-04      | integration | `npm run test:run -- tests/integration/streaming-reconnect.test.ts` | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `tests/unit/config/streaming.test.ts` — config loading tests for heartbeat settings
- [ ] `tests/unit/routes/streaming-headers.test.ts` — header injection tests
- [ ] `tests/unit/streaming/heartbeat.test.ts` — heartbeat timer unit tests
- [ ] `tests/integration/streaming-heartbeat.test.ts` — end-to-end heartbeat tests
- [ ] `tests/integration/streaming-reconnect.test.ts` — reconnection logic tests
- [ ] `tests/fixtures/mock-provider.ts` — mock provider for streaming tests

_If none: "Existing infrastructure covers all phase requirements."_

---

## Manual-Only Verifications

| Behavior                            | Requirement | Why Manual                             | Test Instructions                                                                              |
| ----------------------------------- | ----------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Stream survives 60+ second response | REL-04      | Requires real provider with slow model | 1. Configure reasoning model 2. Send complex prompt 3. Verify stream completes without timeout |
| Heartbeat prevents nginx timeout    | REL-01      | Requires nginx in front                | 1. Deploy behind nginx with 30s timeout 2. Generate 60s response 3. Verify no 504 error        |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

_Phase: 02-reliability-streaming-enhancement_
_Validation created: 2026-03-23_

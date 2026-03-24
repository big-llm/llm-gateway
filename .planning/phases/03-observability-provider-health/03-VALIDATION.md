---
phase: 03
slug: observability-provider-health
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                             |
| ---------------------- | ----------------------------------------------------------------- |
| **Framework**          | vitest                                                            |
| **Config file**        | vitest.config.ts                                                  |
| **Quick run command**  | `npm run test:run -- tests/unit/services/provider-health.test.ts` |
| **Full suite command** | `npm run test:run`                                                |
| **Estimated runtime**  | ~5 seconds                                                        |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run -- tests/unit/services/provider-health.test.ts`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type   | Automated Command                                                 | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ----------- | ----------------------------------------------------------------- | ----------- | ---------- |
| 03-01-01 | 01   | 1    | OBS-01      | unit        | `npm run test:run -- tests/unit/services/provider-health.test.ts` | ❌ W0       | ⬜ pending |
| 03-01-02 | 01   | 1    | OBS-04      | unit        | `npm run test:run -- tests/unit/services/provider-health.test.ts` | ❌ W0       | ⬜ pending |
| 03-02-01 | 02   | 2    | OBS-03      | integration | `npm run test:run -- tests/integration/provider-health.test.ts`   | ❌ W0       | ⬜ pending |
| 03-02-02 | 02   | 2    | OBS-02      | integration | `npm run test:run -- tests/integration/provider-health.test.ts`   | ✅          | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `tests/unit/services/provider-health.test.ts` — stubs for health calculation tests
- [ ] `tests/integration/provider-health.test.ts` — stubs for integration tests

---

## Manual-Only Verifications

| Behavior                             | Requirement | Why Manual                     | Test Instructions                                    |
| ------------------------------------ | ----------- | ------------------------------ | ---------------------------------------------------- |
| Dashboard UI displays success rate % | OBS-03      | Visual verification in browser | Start admin-ui, check provider card shows percentage |

_Also: Unit tests cover calculation logic; integration tests cover API response._

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

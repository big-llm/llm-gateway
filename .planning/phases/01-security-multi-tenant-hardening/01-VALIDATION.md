---
phase: 01
slug: security-multi-tenant-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                                |
| ---------------------- | -------------------------------------------------------------------- |
| **Framework**          | Vitest (already configured)                                          |
| **Config file**        | `vitest.config.ts`                                                   |
| **Quick run command**  | `npx vitest run tests/unit/cache.test.ts tests/unit/tenancy.test.ts` |
| **Full suite command** | `npm run test:run`                                                   |
| **Estimated runtime**  | ~15 seconds                                                          |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/unit/cache.test.ts`
- **After every plan wave:** Run `npm run test:run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type   | Automated Command                                                         | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ----------- | ------------------------------------------------------------------------- | ----------- | ---------- |
| 01-01-01 | 01   | 1    | SEC-01      | unit        | `npx vitest run tests/unit/cache.test.ts -t "cache key tenant prefix"`    | ❌ W0       | ⬜ pending |
| 01-01-02 | 01   | 1    | SEC-01      | unit        | `npx vitest run tests/unit/cache.test.ts -t "generateTenantKey"`          | ❌ W0       | ⬜ pending |
| 01-02-01 | 02   | 1    | SEC-02      | unit        | `npx vitest run tests/unit/cache.test.ts -t "tenant validation"`          | ❌ W0       | ⬜ pending |
| 01-02-02 | 02   | 1    | SEC-02      | integration | `npx vitest run tests/integration/cache-tenant.test.ts`                   | ❌ W0       | ⬜ pending |
| 01-03-01 | 03   | 2    | SEC-03      | integration | `npx vitest run tests/integration/cache-tenant.test.ts -t "cross-tenant"` | ❌ W0       | ⬜ pending |
| 01-03-02 | 03   | 2    | SEC-03      | unit        | `npx vitest run tests/unit/cache.test.ts -t "key collision"`              | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `tests/unit/cache.test.ts` — stubs for cache key generation and tenant validation
- [ ] `tests/integration/cache-tenant.test.ts` — stubs for cross-tenant scenarios
- [ ] Framework already installed (Vitest configured)

---

## Manual-Only Verifications

| Behavior                    | Requirement | Why Manual                        | Test Instructions                                      |
| --------------------------- | ----------- | --------------------------------- | ------------------------------------------------------ |
| Redis key format inspection | SEC-01      | Visual verification in production | `redis-cli keys "llm-cache:*"` to verify tenant prefix |

_All other phase behaviors have automated verification._

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

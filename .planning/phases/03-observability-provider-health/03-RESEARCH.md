# Phase 3: Observability & Provider Health - Research

**Researched:** 2026-03-24
**Status:** Ready for planning

## Research Questions

1. How should the rolling window of 100 requests be implemented?
2. How does the existing ProviderStatus interface need to change?
3. What's the best way to display success rate % in the existing Dashboard UI?
4. What edge cases exist for health calculation?
5. What tests should be written?

---

## Findings

### 1. Rolling Window Implementation

**Recommendation: In-memory circular buffer**

The existing `ProviderStatus` interface tracks cumulative counts (`successCount`, `errorCount`, `totalCount`). For a rolling window, we need to track individual request outcomes.

**Option A: Circular Buffer (Recommended)**

- Store last 100 outcomes as boolean array (true = success, false = error)
- Simple O(1) push operation, O(n) for success rate calculation (but n=100, so negligible)
- No external dependencies needed
- Memory: ~100 bytes per provider

**Option B: Redis Sorted Sets**

- Would persist across restarts
- Overkill for this use case (window is only 100 requests)
- Adds complexity and external dependency

**Option C: Cumulative with Time-Based Reset**

- Current approach (cumulative counts)
- Cannot implement rolling window behavior

**Decision:** Use in-memory circular buffer. Add new field `recentOutcomes: boolean[]` to track last 100 results.

### 2. ProviderStatus Interface Changes

**Current interface (src/services/provider-registry.ts):**

```typescript
export interface ProviderStatus {
  id: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number | null;
  lastCheck: string | null;
  successCount: number; // Cumulative
  errorCount: number; // Cumulative
  totalCount: number; // Cumulative
}
```

**Proposed additions:**

```typescript
export interface ProviderStatus {
  id: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number | null;
  lastCheck: string | null;
  successCount: number; // Keep for backward compatibility
  errorCount: number; // Keep for backward compatibility
  totalCount: number; // Keep for backward compatibility
  recentOutcomes: boolean[]; // NEW: Rolling window of last 100 requests
  lastLatencyMs: number; // NEW: For degraded latency threshold check
}
```

**Health calculation logic (per CONTEXT.md decisions):**

- Calculate success rate from `recentOutcomes` (successes / total outcomes)
- ≥95% = healthy, 80-94% = degraded, <80% = unhealthy
- If latency > 5000ms, force degraded status (D-04)

### 3. Dashboard UI Display

**Current display (admin-ui/src/pages/Dashboard.tsx):**

- Provider card shows: status badge, latency, successCount/totalCount
- Already has `getStatusBadge()` function with success/warning/destructive variants

**Proposed changes:**

```tsx
{
  /* In provider card, add success rate % */
}
<div className="text-xs text-muted-foreground">
  {provider.totalCount > 0
    ? `${((provider.successCount / provider.totalCount) * 100).toFixed(0)}% success`
    : 'No data'}
</div>;
```

**Note:** The existing display shows `{provider.successCount}/{provider.totalCount} success` which is equivalent. Per D-06, we should show percentage instead.

### 4. Edge Cases

**Edge Case 1: Empty Window (no requests yet)**

- `recentOutcomes` = []
- Return `status: 'unhealthy'` (safe default, per existing behavior)
- Success rate = undefined/0%

**Edge Case 2: Partial Window (1-99 requests)**

- Calculate based on available data
- No need to wait for full 100 requests

**Edge Case 3: First Request**

- Initialize `recentOutcomes` array with single outcome
- Calculate health from 1 data point (will be either 0% or 100%)

**Edge Case 4: Latency Threshold (D-04)**

- Need to track last request latency in `lastLatencyMs`
- If `lastLatencyMs > 5000`, set status to 'degraded' regardless of success rate
- Only check latency on requests (not errors)

**Edge Case 5: Concurrency**

- `recordSuccess` / `recordError` are synchronous
- JavaScript is single-threaded, so no race conditions for array push
- If using worker threads later, would need locking

### 5. Test Strategy

**Unit tests for health calculation (new file: tests/unit/services/provider-health.test.ts):**

```typescript
describe('Health Calculation', () => {
  it('should return healthy for 95%+ success rate');
  it('should return degraded for 80-94% success rate');
  it('should return unhealthy for <80% success rate');
  it('should return unhealthy for empty window');
  it('should return degraded for latency > 5000ms');
  it('should handle partial window (50 requests)');
  it('should handle single request (0% or 100%)');
  it('should roll off oldest outcomes when window full');
});
```

**Integration test for auto-calculation:**

```typescript
describe('Provider Health Auto-Update', () => {
  it('should update health status after recordSuccess');
  it('should update health status after recordError');
  it('should reflect degraded status after consecutive errors');
});
```

---

## Validation Architecture

### Pre-Implementation Tests (Nyquist Validation)

**Must verify before implementation:**

1. Health calculation produces expected status for given outcomes
2. Rolling window correctly discards oldest outcomes
3. Latency threshold correctly overrides success-based status
4. Edge cases handled correctly (empty, partial, single)

### Test Commands

```bash
# Run health calculation tests
npm run test:run -- tests/unit/services/provider-health.test.ts

# Run integration tests
npm run test:run -- tests/integration/provider-health.test.ts
```

---

## Implementation Approach

### Phase 1: Core Health Calculation (Plan 01)

1. **Add rolling window to ProviderStatus**
   - Add `recentOutcomes: boolean[]` field
   - Add `lastLatencyMs: number` field for latency threshold
2. **Implement health calculation function**
   - Input: recentOutcomes, lastLatencyMs
   - Output: 'healthy' | 'degraded' | 'unhealthy'
   - Logic: success rate thresholds + latency override

3. **Update recordSuccess/recordError**
   - Push outcome to circular buffer
   - Trim to 100 elements if exceeded
   - Recalculate and update status immediately (per D-02)

4. **Add unit tests**
   - Test all edge cases and thresholds

### Phase 2: Dashboard Integration (Plan 02)

1. **Update Dashboard UI**
   - Display success rate percentage
   - Keep existing status badge
2. **Add integration tests**
   - Verify end-to-end health tracking

---

## Dependencies

### Existing Code to Modify

- `src/services/provider-registry.ts` - Add rolling window, health calculation
- `admin-ui/src/pages/Dashboard.tsx` - Display success rate %

### New Code to Create

- `tests/unit/services/provider-health.test.ts` - Health calculation tests

### No External Dependencies

All implementation uses existing stack (TypeScript, Zod for validation). No new packages needed.

---

## Risks & Mitigations

| Risk                        | Mitigation                                |
| --------------------------- | ----------------------------------------- |
| Circular buffer memory leak | Fixed size (100), bounded array           |
| Health status flapping      | Thresholds have gaps (80-94%, 95%+)       |
| Latency tracking on errors  | Only track latency on successful requests |
| Backward compatibility      | Keep existing cumulative count fields     |

---

## Summary

The implementation is straightforward:

1. Add rolling window array to ProviderStatus
2. Implement health calculation with thresholds
3. Auto-calculate after each request
4. Update dashboard to show percentage

No external dependencies, no complex infrastructure. All in-memory, synchronous operations.

---

_Phase: 03-observability-provider-health_
_Research completed: 2026-03-24_

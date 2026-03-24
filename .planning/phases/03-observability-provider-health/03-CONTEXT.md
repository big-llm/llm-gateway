# Phase 3: Observability & Provider Health - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Track provider health status in dashboard so admins can monitor providers and identify issues before users report them.

Requirements: OBS-01, OBS-02, OBS-03, OBS-04

</domain>

<decisions>
## Implementation Decisions

### Health Calculation (OBS-04)

- **D-01:** Health status calculated **per-request** using rolling window of last 100 requests
- **D-02:** Health updates immediately after each request — no periodic batch needed

### Health Thresholds

- **D-03:** Success rate thresholds:
  - ≥95% success = **healthy**
  - 80-94% success = **degraded**
  - <80% success = **unhealthy**
- **D-04:** Latency consideration: responses >5000ms trigger **degraded** status regardless of success rate

### Health Calculation Window

- **D-05:** Rolling window of last **100 requests** per provider determines health status

### UI Display (OBS-03)

- **D-06:** Display **success rate %** in provider card on dashboard
- Keep existing status badge (healthy/degraded/unhealthy with color coding)

### Existing Endpoints (OBS-02)

- Keep existing `/admin/health/providers` endpoint — returns provider health for all configured providers
- Already implemented, no changes needed

### Agent's Discretion

- Error message truncation length for UI
- Exact placement of success rate in provider card layout

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Code

- `src/admin-store.ts` — ProviderHealthSchema and getProviderHealth() method
- `src/services/provider-registry.ts` — ProviderStatus interface, recordSuccess/recordError methods
- `src/admin/health.ts` — /health/providers endpoint
- `admin-ui/src/pages/Dashboard.tsx` — Provider status display with badges
- `admin-ui/src/api/providers.ts` — useProviderHealth hook

### Requirements

- `REQUIREMENTS.md` §Observability — OBS-01 through OBS-04 requirements

No external specs — requirements fully captured in decisions above

</canonical_refs>

## Existing Code Insights

### Reusable Assets

- `ProviderHealthSchema` — already defines health status structure
- `providerRegistry.recordSuccess()` / `recordError()` — methods to track outcomes
- `adminStore.getProviderHealth()` — returns health data for all providers
- Dashboard has provider status cards with status badges

### Established Patterns

- Health status stored in ProviderStatus interface: {status, latencyMs, lastCheck, successCount, errorCount, totalCount}
- Provider status displayed with Badge component (success/warning/destructive variants)
- `/admin/health/providers` returns array of provider health objects

### Integration Points

- Update `provider-registry.ts` to auto-calculate health after each recordSuccess/recordError call
- Update dashboard to show success rate percentage in provider card
- Keep backward compatibility with manual `/admin/providers/:id/test` endpoint

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 03-observability-provider-health_
_Context gathered: 2026-03-24_

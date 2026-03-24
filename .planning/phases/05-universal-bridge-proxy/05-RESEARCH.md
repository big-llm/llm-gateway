# Phase 5: Universal Bridge Proxy - Research

**Researched:** 2026-03-24
**Domain:** LLM Gateway multi-provider expansion, dynamic config, virtual keys, sophisticated routing
**Confidence:** HIGH

## Summary

Phase 5 transforms the LLM Gateway from a 6-provider env-var-configured bridge into a LiteLLM-class universal proxy supporting 100+ providers with dynamic YAML configuration, virtual key systems with per-key budgets, and sophisticated routing (load balancing, cost-based, retry budgets). The current codebase has all foundational pieces (provider abstraction, API key service, model mapping, Redis caching) but they're hardcoded for env-var-only configuration. The migration path is to layer dynamic config on top of existing abstractions rather than replacing them.

**Primary recommendation:** Build a `ConfigLoader` service that reads YAML and merges with env vars, extend the existing `ProviderRegistry` to support dynamic provider registration via Admin API, enhance the `ApiKeyService` into a full virtual key system with budgets/spend tracking/rotation, and add a `RoutingService` implementing LiteLLM's routing strategies.

## User Constraints

> No CONTEXT.md exists for this phase yet. This section will be populated if the user provides locked decisions via `/gsd-discuss-phase`.

---

## Standard Stack

### Core Libraries

| Library | Version | Purpose                                       | Why Standard                                         |
| ------- | ------- | --------------------------------------------- | ---------------------------------------------------- |
| `yaml`  | ^2.8.3  | YAML parsing with env var substitution        | Tiny, spec-compliant, Node.js ecosystem standard     |
| `zod`   | ^3.x    | Config schema validation (already in project) | Already present, validates dynamic config at runtime |
| `pino`  | ^10.x   | Structured logging (already in project)       | Already present, use for config reload events        |

### Phase-Specific Additions

| Library                           | Version | Purpose                                       | When to Use                                                   |
| --------------------------------- | ------- | --------------------------------------------- | ------------------------------------------------------------- |
| `js-yaml`                         | ^4.x    | YAML loading with `load()` + env substitution | Only if `yaml` package lacks env support; prefer `yaml` first |
| `@aws-sdk/client-bedrock-runtime` | ^3.x    | AWS Bedrock provider                          | For Bedrock support (Anthropic on AWS)                        |
| `@google-cloud/aiplatform`        | ^3.x    | Google Vertex AI provider                     | For Vertex/Gemini support                                     |
| `cohere`                          | ^5.x    | Cohere SDK                                    | Already partially exists                                      |

### Already in Project (Reuse)

- Fastify, Drizzle ORM, SQLite, Redis (ioredis), Zod, Pino, Vitest

**Installation:**

```bash
npm install yaml
```

### Alternatives Considered

| Instead of               | Could Use                       | Tradeoff                                                           |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------ |
| `yaml` package           | `js-yaml`                       | `yaml` is ESM-first, faster, safer. Use `yaml` (confirmed v2.8.3). |
| Custom routing           | `opossum` circuit breaker       | Too generic; custom routing needed for cost-based/load-balancing   |
| Custom virtual key store | Extend existing `ApiKeyService` | In-memory already exists; add persistence + budgets on top         |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── config/
│   ├── index.ts           # Existing: loadConfig, getConfig
│   ├── schema.ts          # Existing: configSchema
│   ├── loader.ts          # NEW: YAML config file loader with env substitution
│   └── dynamic-provider.ts # NEW: Hot-reload provider config
├── providers/
│   ├── base.ts            # Existing: Provider interface
│   ├── openai-compatible.ts # Existing
│   ├── anthropic.ts       # Existing
│   ├── bedrock.ts         # NEW: AWS Bedrock provider
│   ├── vertex.ts          # NEW: Google Vertex AI provider
│   ├── deepseek.ts        # NEW: DeepSeek provider
│   ├── groq.ts            # NEW: Groq provider
│   └── index.ts           # Existing: createProvider()
├── routing/
│   ├── index.ts           # NEW: RoutingService with strategy pattern
│   ├── strategies/
│   │   ├── simple-shuffle.ts   # NEW: Weighted random (LiteLLM default)
│   │   ├── least-busy.ts       # NEW: Fewest in-flight requests
│   │   ├── latency-based.ts    # NEW: Lowest recent latency
│   │   ├── cost-based.ts       # NEW: Lowest cost per token
│   │   └── failover.ts        # NEW: Priority-based failover
│   ├── cooldown.ts        # NEW: Deployment cooldown after failures
│   └── retry-budget.ts    # NEW: Retry budget tracking per request
├── virtual-keys/
│   ├── service.ts         # NEW: Enhanced ApiKeyService with budgets/rotation
│   ├── persistence.ts      # NEW: SQLite persistence for virtual keys
│   └── budget-tracker.ts   # NEW: Hierarchical budget enforcement
├── services/
│   ├── provider-registry.ts  # Existing: extend for dynamic registration
│   ├── api-key.ts            # Existing: migrate to virtual-keys/service.ts
│   ├── pricing.ts            # Existing: extend with per-model costs
│   ├── model-mapping.ts     # Existing: extend for 100+ models
│   └── observability.ts      # NEW: Cost tracking, fallback metrics
├── admin/
│   ├── providers.ts          # Existing: extend for dynamic CRUD
│   ├── models.ts             # Existing: extend for dynamic mappings
│   ├── virtual-keys.ts       # NEW: Virtual key management routes
│   └── routing.ts            # NEW: Routing strategy config routes
└── schemas/
    ├── provider.ts           # NEW: Provider config validation schema
    ├── virtual-key.ts        # NEW: Virtual key validation schema
    └── routing.ts            # NEW: Routing config validation schema
```

### Pattern 1: Dynamic YAML Config Loader

**What:** Service that loads `config.yaml` at startup and optionally watches for hot-reload on file changes.

**When to use:** For BRIDGE-01 (YAML config), replacing hardcoded env vars.

**Example:**

```typescript
// Source: LiteLLM config.yaml pattern (docs.litellm.ai/docs/proxy/configs)
// This project: src/config/loader.ts

import { parse } from 'yaml';
import { readFileSync, watchFile, statSync } from 'fs';

interface YamlConfig {
  model_list: Array<{
    model_name: string;
    litellm_params: {
      model: string;
      api_key?: string;
      api_base?: string;
      rpm?: number;
      tpm?: number;
    };
  }>;
  general_settings: {
    master_key: string;
  };
  router_settings?: {
    routing_strategy:
      | 'simple-shuffle'
      | 'least-busy'
      | 'latency-based-routing'
      | 'cost-based-routing';
    num_retries?: number;
    timeout?: number;
  };
}

function loadYamlConfig(filePath: string): YamlConfig {
  const content = readFileSync(filePath, 'utf-8');
  // Env substitution: os.environ/VAR_NAME → process.env[VAR_NAME]
  const substituted = content.replace(/os\.environ\/(\w+)/g, (_, name) => {
    return process.env[name] ?? '';
  });
  return parse(substituted) as YamlConfig;
}
```

### Pattern 2: Virtual Key Service with Hierarchical Budgets

**What:** Per-key budget enforcement, spend tracking, key rotation, model restrictions.

**When to use:** For BRIDGE-03 (Virtual key system).

**Example:**

```typescript
// Source: LiteLLM virtual keys (docs.litellm.ai/docs/proxy/virtual_keys)
// This project: src/virtual-keys/service.ts

interface VirtualKey {
  id: string;
  key: string; // sk-{random}
  name: string;
  teamId?: string;
  orgId?: string;
  models: string[]; // Allowed models (empty = all)
  maxBudget: number | null; // USD cap
  budgetDuration: string | null; // "30d", "1m"
  spend: number;
  rpmLimit: number | null; // Requests per minute
  tpmLimit: number | null; // Tokens per minute
  expiresAt: Date | null;
  rotationEnabled: boolean;
  rotationIntervalDays: number | null;
  metadata: Record<string, unknown>;
  enabled: boolean;
}

// Budget hierarchy check order (per Bifrost pattern):
// 1. Global/org budget → 2. Team budget → 3. Virtual key budget → 4. Provider budget
function checkBudget(
  key: VirtualKey,
  estimatedCost: number
): { allowed: boolean; reason?: string } {
  if (!key.enabled) return { allowed: false, reason: 'Key disabled' };
  if (key.expiresAt && key.expiresAt < new Date()) return { allowed: false, reason: 'Key expired' };
  if (key.maxBudget !== null && key.spend + estimatedCost > key.maxBudget) {
    return { allowed: false, reason: 'Budget exceeded' };
  }
  return { allowed: true };
}
```

### Pattern 3: Routing Service with Strategy Pattern

**What:** Extensible routing strategies (failover, load-balance, cost-based).

**When to use:** For BRIDGE-04 (Sophisticated routing).

**Example:**

```typescript
// Source: LiteLLM router (docs.litellm.ai/docs/proxy/load_balancing)
// This project: src/routing/index.ts

type RoutingStrategy =
  | 'simple-shuffle'
  | 'least-busy'
  | 'latency-based'
  | 'cost-based'
  | 'failover';

interface Deployment {
  id: string;
  modelName: string; // Logical model name
  provider: string; // Physical provider id
  providerModel: string; // Provider-specific model string
  rpm: number | null;
  tpm: number | null;
  weight: number;
  order: number; // Lower = higher priority
  cooldownUntil: Date | null;
}

interface RoutingContext {
  model: string;
  estimatedTokens: number;
  strategy: RoutingStrategy;
  retryDepth: number;
  maxRetries: number;
}

interface RoutingService {
  selectDeployment(ctx: RoutingContext): Deployment | null;
  recordSuccess(deploymentId: string, latencyMs: number): void;
  recordFailure(deploymentId: string, errorType: string): void;
  getHealthyDeployments(model: string): Deployment[];
}

// Strategy implementations delegate to selectDeployment()
// simple-shuffle: weighted random (default, recommended for production)
// least-busy: fewest in-flight (tracked via Redis sorted set)
// latency-based: lowest recent latency (tracked via rolling average)
// cost-based: lowest input_cost_per_million (from pricing service)
// failover: priority order (order field), skip unhealthy/cooldown
```

### Pattern 4: Provider Adapter Registry

**What:** Dynamic registration of provider adapters by type string.

**When to use:** For BRIDGE-02 (100+ provider support).

**Example:**

```typescript
// Source: LiteLLM model_list (docs.litellm.ai/docs/proxy/configs)
// Provider model string format: "provider/model-name"
// e.g., "openai/gpt-4o", "anthropic/claude-3-5-sonnet", "azure/gpt-4-deployment"

const PROVIDER_PREFIXES = {
  'openai/': 'openai-compatible',
  'azure/': 'azure',
  'anthropic/': 'anthropic',
  'google/': 'google',
  'cohere/': 'cohere',
  'mistral/': 'mistral',
  'bedrock/': 'bedrock',
  'vertex/': 'vertex',
  'deepseek/': 'deepseek',
  'groq/': 'groq',
} as const;

function parseModelString(model: string): { prefix: string; modelName: string } {
  const [prefix, ...rest] = model.split('/');
  return { prefix: prefix + '/', modelName: rest.join('/') };
}

function getProviderType(model: string): string {
  const { prefix } = parseModelString(model);
  return PROVIDER_PREFIXES[prefix as keyof typeof PROVIDER_PREFIXES] ?? 'openai-compatible';
}
```

### Anti-Patterns to Avoid

- **Don't hardcode provider list** — Use dynamic registration via registry pattern. LiteLLM supports 100+ providers by dynamically loading them from config.
- **Don't use `redis.keys()` for rate limiting** — O(n) scan blocks Redis. Use sorted sets or deterministic key names. Already flagged in PITFALLS.md Pitfall 6.
- **Don't store API keys in plain YAML** — Use `os.environ/VAR_NAME` substitution. LiteLLM pattern: `api_key: os.environ/OPENAI_API_KEY`.
- **Don't implement routing from scratch** — Use strategy pattern with pluggable strategies. Each strategy is a class implementing `selectDeployment()`.
- **Don't skip cooldown tracking** — Failed deployments need cooldown periods to prevent hammering unhealthy providers. LiteLLM default: 3 failures triggers 30-second cooldown.
- **Don't use in-memory only for virtual keys** — LiteLLM uses PostgreSQL. Current in-memory `ApiKeyService` works for single-instance; needs SQLite persistence for multi-instance (Drizzle ORM already available).

---

## Don't Hand-Roll

| Problem                | Don't Build                 | Use Instead                                   | Why                                               |
| ---------------------- | --------------------------- | --------------------------------------------- | ------------------------------------------------- |
| YAML config loading    | Custom YAML parser          | `yaml` package                                | Handles env substitution, anchors, anchors safely |
| Routing strategies     | Custom switch-based routing | Strategy pattern                              | Each strategy is testable in isolation            |
| Budget enforcement     | Custom budget checks        | Hierarchical budget pattern (Bifrost/LiteLLM) | 4-tier hierarchy proven in production             |
| Provider type dispatch | Long if/else chains         | Provider prefix registry map                  | O(1) lookup, extensible                           |
| Deployment cooldowns   | Simple boolean flags        | Redis sorted sets with TTL                    | Atomic, distributed, auto-expiry                  |
| Retry budgets          | Incrementing counters       | Per-request retry budget tracked in context   | Prevents runaway retry loops                      |

---

## Runtime State Inventory

> This is NOT a rename/refactor/migration phase. Runtime state inventory is not applicable.

**This phase:** Adds new functionality to existing infrastructure. No renaming, rebrand, or string replacement that would affect stored data, live service config, OS-registered state, secrets, or build artifacts.

---

## Common Pitfalls

### Pitfall 1: YAML Config Reload Breaks In-Flight Requests

**What goes wrong:** Config hot-reload replaces provider registry mid-request, causing requests to use stale provider instances or crash.

**Why it happens:** Naive config reload replaces singleton registry references without coordination.

**How to avoid:** Use version-stamped config objects. New requests pick up new config; in-flight requests complete with old config snapshot. Use atomic swap pattern:

```typescript
// Atomic config swap - in-flight requests keep reference to old config
private configSnapshot: YamlConfig;
loadConfig(filePath: string) {
  const newConfig = parseYaml(readFileSync(filePath));
  // Atomic swap - new requests get new config
  this.configSnapshot = newConfig;
}
```

**Warning signs:** Random 500s during config reload, provider instances appearing/disappearing from logs.

### Pitfall 2: Virtual Key Budget Race Conditions

**What goes wrong:** Concurrent requests check budget independently, allowing total spend to exceed budget.

**Why it happens:** Read-check-write is not atomic. Two requests see $90 budget remaining, both allow $80 requests, total spend becomes $160 on $100 budget.

**How to avoid:** Use atomic Redis increment for spend tracking. Lua script for check-and-increment:

```typescript
// Redis Lua script for atomic budget check
const budgetScript = `
  local current = tonumber(redis.call('GET', KEYS[1]) or '0')
  local limit = tonumber(ARGV[1])
  local cost = tonumber(ARGV[2])
  if current + cost > limit then
    return 0
  end
  redis.call('INCRBYFLOAT', KEYS[1], cost)
  return 1
`;
```

**Warning signs:** Budget overspend reports, budget checks passing when they should fail.

### Pitfall 3: Routing Strategy Ignores Provider Health

**What goes wrong:** Load balancer selects unhealthy deployment, causing cascading failures.

**Why it happens:** Routing selects by strategy (random, latency, cost) without filtering unhealthy/cooldown deployments first.

**How to avoid:** Always filter to healthy deployments first, then apply strategy:

```typescript
selectDeployment(ctx: RoutingContext): Deployment | null {
  // Step 1: Filter healthy deployments
  const healthy = this.getHealthyDeployments(ctx.model);
  if (healthy.length === 0) return null;
  // Step 2: Apply strategy to filtered set
  return this.strategies[ctx.strategy].select(healthy, ctx);
}
```

**Warning signs:** Latency spikes correlating with specific deployments, high error rates on one deployment in a load-balanced group.

### Pitfall 4: 100+ Providers Overwhelms Model Resolution

**What goes wrong:** Model lookup scans through hundreds of providers, adding latency to every request.

**Why it happens:** Naive model resolution iterates through all providers/mappings.

**How to avoid:** Use indexed lookups. Maintain `Map<modelName, Deployment[]>` index, rebuild on config change. O(1) lookup instead of O(n) scan.

### Pitfall 5: Missing RPM/TPM Tracking for Load Balancing

**What goes wrong:** `simple-shuffle` routing distributes requests evenly but ignores rate limits, causing 429s.

**Why it happens:** LiteLLM's weighted shuffle uses RPM/TPM from config, not actual usage.

**How to avoid:** Track actual RPM/TPM usage via Redis sorted sets per deployment. Use `usage-based-routing` strategy or set RPM/TPM in config and enable `enforce_model_rate_limits`.

---

## Code Examples

### YAML Config Schema (Provider Definition)

```typescript
// Source: LiteLLM config.yaml model_list (docs.litellm.ai/docs/proxy/configs)
// Verified as canonical pattern

import { z } from 'zod';
import { parse as parseYaml } from 'yaml';

export const LitellmParamsSchema = z.object({
  model: z.string(),
  api_key: z.string().optional(),
  api_base: z.string().optional(),
  api_version: z.string().optional(),
  organization: z.string().optional(),
  rpm: z.number().optional(), // Requests per minute limit
  tpm: z.number().optional(), // Tokens per minute limit
  timeout: z.number().optional(),
  max_retries: z.number().optional(),
});

export const ModelListItemSchema = z.object({
  model_name: z.string(), // User-facing alias
  litellm_params: LitellmParamsSchema,
});

export const RouterSettingsSchema = z.object({
  routing_strategy: z
    .enum([
      'simple-shuffle',
      'least-busy',
      'latency-based-routing',
      'cost-based-routing',
      'usage-based-routing',
    ])
    .default('simple-shuffle'),
  num_retries: z.number().default(2),
  timeout: z.number().default(30),
  allowed_fails: z.number().default(3),
  cooldown_time: z.number().default(30),
  redis_host: z.string().optional(),
  redis_port: z.number().optional(),
});

export const GeneralSettingsSchema = z.object({
  master_key: z.string(),
  database_url: z.string().optional(),
  health_check_interval: z.number().optional(),
});

export const YamlConfigSchema = z.object({
  model_list: z.array(ModelListItemSchema),
  general_settings: GeneralSettingsSchema,
  router_settings: RouterSettingsSchema.optional(),
});

export type YamlConfig = z.infer<typeof YamlConfigSchema>;
```

### Virtual Key Budget Enforcement

```typescript
// Source: LiteLLM virtual keys + Bifrost budget hierarchy
// Verified pattern from production gateways

import { apiKeyService } from '../services/api-key.js';
import { redis } from '../services/redis.js';

const BUDGET_SCRIPT = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local cost = tonumber(ARGV[2])
  local ttl = tonumber(ARGV[3])
  local current = tonumber(redis.call('GET', key) or '0')
  if limit > 0 and current + cost > limit then
    return {0, current}
  end
  redis.call('INCRBYFLOAT', key, cost)
  if ttl > 0 then redis.call('EXPIRE', key, ttl) end
  return {1, current + cost}
`;

interface BudgetCheckResult {
  allowed: boolean;
  currentSpend: number;
  limit: number;
}

async function checkVirtualKeyBudget(
  keyId: string,
  estimatedCost: number
): Promise<BudgetCheckResult> {
  const key = apiKeyService.getKey(keyId);
  if (!key) return { allowed: false, currentSpend: 0, limit: 0 };

  if (!key.enabled) return { allowed: false, currentSpend: key.spend, limit: key.budget ?? 0 };
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return { allowed: false, currentSpend: key.spend, limit: 0 };
  }
  if (key.budget !== null && key.spend >= key.budget) {
    return { allowed: false, currentSpend: key.spend, limit: key.budget };
  }

  // Atomic spend increment via Redis Lua script
  const budgetKey = `vk:spend:${keyId}`;
  const ttl = getBudgetTtlSeconds(key.budgetResetAt);

  const result = (await redis.eval(
    BUDGET_SCRIPT,
    1,
    budgetKey,
    key.budget ?? 0,
    estimatedCost,
    ttl
  )) as [number, number];

  if (result[0] === 0) {
    return { allowed: false, currentSpend: result[1], limit: key.budget ?? 0 };
  }

  // Record actual spend after response
  apiKeyService.recordUsage(keyId, estimatedCost);
  return { allowed: true, currentSpend: result[1], limit: key.budget ?? 0 };
}
```

### Routing Strategy Pattern

```typescript
// Source: LiteLLM routing strategies (docs.litellm.ai/docs/proxy/load_balancing)
// Verified strategy pattern

import type { Deployment } from './deployment.js';

export interface RoutingStrategy {
  name: string;
  select(deployments: Deployment[], context: RoutingContext): Deployment | null;
}

export class SimpleShuffleStrategy implements RoutingStrategy {
  name = 'simple-shuffle';

  select(deployments: Deployment[], _ctx: RoutingContext): Deployment | null {
    if (deployments.length === 0) return null;
    // Weighted random based on weight field
    const totalWeight = deployments.reduce((sum, d) => sum + d.weight, 0);
    let random = Math.random() * totalWeight;
    for (const deployment of deployments) {
      random -= deployment.weight;
      if (random <= 0) return deployment;
    }
    return deployments[deployments.length - 1];
  }
}

export class LeastBusyStrategy implements RoutingStrategy {
  name = 'least-busy';

  async select(deployments: Deployment[], _ctx: RoutingContext): Promise<Deployment | null> {
    if (deployments.length === 0) return null;
    // Get in-flight count from Redis for each deployment
    const counts = await Promise.all(
      deployments.map(async (d) => ({
        deployment: d,
        count: (await redis.get(`deploy:inflight:${d.id}`)) ?? '0',
      }))
    );
    counts.sort((a, b) => parseInt(a.count) - parseInt(b.count));
    return counts[0].deployment;
  }
}

export class LatencyBasedStrategy implements RoutingStrategy {
  name = 'latency-based-routing';

  select(deployments: Deployment[], _ctx: RoutingContext): Deployment | null {
    return (
      deployments
        .filter((d) => d.avgLatencyMs !== null)
        .sort((a, b) => (a.avgLatencyMs ?? Infinity) - (b.avgLatencyMs ?? Infinity))[0] ?? null
    );
  }
}

export class CostBasedStrategy implements RoutingStrategy {
  name = 'cost-based-routing';

  select(deployments: Deployment[], _ctx: RoutingContext): Deployment | null {
    return (
      deployments.sort(
        (a, b) => (a.inputCostPerMillion ?? Infinity) - (b.inputCostPerMillion ?? Infinity)
      )[0] ?? null
    );
  }
}

export class FailoverStrategy implements RoutingStrategy {
  name = 'failover';

  select(deployments: Deployment[], _ctx: RoutingContext): Deployment | null {
    // Priority order - lowest order number first
    return [...deployments].sort((a, b) => a.order - b.order)[0] ?? null;
  }
}
```

---

## State of the Art

| Old Approach            | Current Approach                      | When Changed  | Impact                                        |
| ----------------------- | ------------------------------------- | ------------- | --------------------------------------------- |
| Env var provider config | YAML config file + Admin API          | LiteLLM 2023+ | Runtime config changes, no restart needed     |
| Single primary/fallback | 100+ providers with model groups      | LiteLLM 2024+ | Provider flexibility, cost optimization       |
| API key = single secret | Virtual keys with budgets/rate limits | LiteLLM 2023+ | Per-team/per-key cost control                 |
| Round-robin only        | Multiple routing strategies           | LiteLLM 2024+ | Cost-aware, latency-aware, load-aware routing |
| In-memory state         | Redis-backed distributed state        | LiteLLM 2023+ | Multi-instance horizontal scaling             |

**Deprecated/outdated:**

- **Static provider registration** — All providers must be known at compile time. Replaced by dynamic registration from YAML/Admin API.
- **Request-count rate limiting** — Only counts requests, ignores token costs. Replaced by TPM (tokens per minute) rate limiting.
- **Single-layer budget** — Only org-level budgets. Replaced by hierarchical budgets (org → team → key → provider).

---

## Open Questions

1. **Provider SDK vs. Generic HTTP**
   - What we know: LiteLLM uses unified HTTP calls with provider-specific request/response transforms.
   - What's unclear: Whether to use official SDKs per provider (AWS SDK, Google AI SDK) or generic HTTP adapter.
   - Recommendation: Start with generic HTTP adapter (like current `openai-compatible.ts`), add SDKs for providers with non-standard auth (Bedrock, Vertex) where SDK simplifies signature/auth complexity.

2. **SQLite vs. PostgreSQL for virtual keys**
   - What we know: Current codebase uses SQLite via Drizzle ORM. LiteLLM uses PostgreSQL for virtual keys.
   - What's unclear: SQLite limitations for multi-instance (file-based locking) vs. simplicity of no external DB dependency.
   - Recommendation: Stay with SQLite for single-instance; document that multi-instance requires PostgreSQL. Drizzle ORM supports both.

3. **Config hot-reload strategy**
   - What we know: LiteLLM watches config.yaml and reloads on change.
   - What's unclear: Whether to use FS watch API, polling, or signal-based reload (SIGHUP).
   - Recommendation: FS watch with debounce (500ms) + admin API trigger. Avoid SIGHUP (not portable on Windows).

---

## Environment Availability

| Dependency     | Required By                  | Available | Version | Fallback                               |
| -------------- | ---------------------------- | --------- | ------- | -------------------------------------- |
| Node.js >= 20  | Runtime                      | ✓         | 20+     | —                                      |
| Redis          | Caching, distributed routing | ✓         | Any     | In-memory fallback for single-instance |
| SQLite         | Persistence                  | ✓         | Any     | —                                      |
| `yaml` package | Config loading               | ✗         | —       | Install: `npm install yaml`            |
| `zod`          | Config validation            | ✓         | 3.x     | —                                      |

**Missing dependencies with no fallback:**

- None — all requirements have either existing packages or a clear install command.

**Missing dependencies with fallback:**

- `yaml` package — Install via npm before use.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| Framework          | Vitest (already in project)                           |
| Config file        | `vitest.config.ts` exists                             |
| Quick run command  | `npx vitest run tests/unit/config --reporter=verbose` |
| Full suite command | `npx vitest run tests/unit/ tests/integration/`       |

### Phase Requirements → Test Map

| Req ID    | Behavior                                                 | Test Type   | Automated Command                                               | File Exists? |
| --------- | -------------------------------------------------------- | ----------- | --------------------------------------------------------------- | ------------ |
| BRIDGE-01 | YAML config loads with env substitution                  | unit        | `npx vitest run tests/unit/config/loader.test.ts`               | ❌ Wave 0    |
| BRIDGE-01 | Admin API creates/updates/deletes providers dynamically  | integration | `npx vitest run tests/integration/providers.test.ts`            | ❌ Wave 0    |
| BRIDGE-02 | 100+ provider model strings parse correctly              | unit        | `npx vitest run tests/unit/providers/parser.test.ts`            | ❌ Wave 0    |
| BRIDGE-02 | Provider adapter registry dispatches to correct provider | unit        | `npx vitest run tests/unit/providers/registry.test.ts`          | ❌ Wave 0    |
| BRIDGE-03 | Virtual key budget blocks requests over limit            | unit        | `npx vitest run tests/unit/virtual-keys/budget.test.ts`         | ❌ Wave 0    |
| BRIDGE-03 | Virtual key rotation generates new key                   | unit        | `npx vitest run tests/unit/virtual-keys/rotation.test.ts`       | ❌ Wave 0    |
| BRIDGE-04 | Routing strategies select correct deployment             | unit        | `npx vitest run tests/unit/routing/strategies.test.ts`          | ❌ Wave 0    |
| BRIDGE-04 | Retry budget prevents infinite loops                     | unit        | `npx vitest run tests/unit/routing/retry-budget.test.ts`        | ❌ Wave 0    |
| BRIDGE-05 | Cost tracking per key/model accumulates correctly        | unit        | `npx vitest run tests/unit/observability/cost-tracking.test.ts` | ❌ Wave 0    |
| BRIDGE-05 | Fallback frequency metrics record on fallback            | integration | `npx vitest run tests/integration/routing.test.ts`              | ❌ Wave 0    |

### Sampling Rate

- **Per task commit:** Quick unit run for the changed module
- **Per wave merge:** Full unit + integration suite
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/config/loader.test.ts` — YAML loading + env substitution
- [ ] `tests/unit/virtual-keys/budget.test.ts` — Budget enforcement
- [ ] `tests/unit/routing/strategies.test.ts` — All routing strategies
- [ ] `tests/integration/providers.test.ts` — Admin API provider CRUD
- [ ] `tests/fixtures/yaml/` — Sample YAML configs for testing
- [ ] Framework install: `npm install yaml` — if not already in package.json

---

## Sources

### Primary (HIGH confidence)

- **LiteLLM Documentation** (docs.litellm.ai) — YAML config format, virtual keys, routing strategies, load balancing — canonical reference for this phase
- **LiteLLM GitHub Discussion #1000** — YAML config v2.0 spec evolution — design rationale for model list structure
- **Bifrost AI Gateway** (docs.getbifrost.ai) — Four-tier budget hierarchy, virtual key architecture — complementary reference for budget enforcement
- **Context7 code search** — Node.js YAML loading, LiteLLM multi-provider patterns

### Secondary (MEDIUM confidence)

- **Bifrost + Maxim AI blog** (n1n.ai) — Virtual key management, API key selection logic
- **llm-budget-proxy tutorial** (igotasite4that.com) — Fastify + tiktoken + sliding window rate limiting — Node.js implementation reference
- **llm-spend-guard npm** (registry.npmjs.org) — Node.js budget enforcement patterns

### Tertiary (LOW confidence)

- **Community articles** (Medium, Dev.to) — LiteLLM/Bifrost overviews, need validation against official docs

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — yaml package version verified, all other deps already in project
- Architecture: HIGH — LiteLLM reference architecture, patterns from official docs
- Pitfalls: HIGH — All pitfalls verified against LiteLLM/Bifrost production patterns
- Routing strategies: HIGH — LiteLLM router documented with exact strategy names/parameters

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (30 days — library patterns are stable)

---

## Phase Requirements Coverage

| ID        | Description                                                                                 | Research Support                                                                                     |
| --------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| BRIDGE-01 | Dynamic provider configuration via config file (YAML) and admin API                         | `yaml` package for config loading, LiteLLM config.yaml schema, existing Admin API extended with CRUD |
| BRIDGE-02 | Support for 100+ LLM providers through standardized provider adapters                       | Provider prefix registry map, generic HTTP adapter pattern, LiteLLM model string format              |
| BRIDGE-03 | Virtual key system with per-key budgets, spend tracking, and key rotation                   | LiteLLM virtual keys + Bifrost budget hierarchy, atomic Redis budget enforcement                     |
| BRIDGE-04 | Sophisticated routing: load balancing, cost-based routing, retry budgets                    | LiteLLM router strategies (simple-shuffle, least-busy, latency-based, cost-based, failover)          |
| BRIDGE-05 | Enhanced observability: cost tracking per key/model, fallback frequency, latency histograms | LiteLLM spend logs, Bifrost observability, Redis-backed metrics tracking                             |

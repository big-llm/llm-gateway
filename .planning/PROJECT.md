# LLM Gateway

## What This Is

LLM Gateway is an Anthropic-OpenAI bridge service with enterprise features including multi-tenancy, budget enforcement, and Redis-backed caching/rate limiting. It proxies LLM API requests to multiple providers (OpenAI, Anthropic, Azure, Google, Cohere, Mistral) while normalizing responses to both OpenAI and Anthropic formats.

## Core Value

Provide a unified API gateway that abstracts away provider differences and enables enterprise features (multi-tenancy, rate limiting, budgets) across multiple LLM providers.

## Requirements

### Validated

- ✓ OpenAI-compatible `/v1/chat/completions` endpoint — existing
- ✓ Anthropic-compatible `/v1/messages` endpoint — existing
- ✓ `/v1/models` listing endpoint — existing
- ✓ `/v1/embeddings` endpoint — existing
- ✓ Multi-provider support (OpenAI, Anthropic, Azure, Google, Cohere, Mistral) — existing
- ✓ SQLite database with Drizzle ORM — existing
- ✓ Redis caching and rate limiting — existing
- ✓ Multi-tenancy (Orgs, Teams, Users) — existing
- ✓ Admin API with API key management — existing
- ✓ Request logging and usage tracking — existing
- ✓ Budget enforcement per org/team — existing
- ✓ Cache tenant isolation (SEC-01, SEC-02, SEC-03) — Validated in Phase 1
- ✓ SSE heartbeat mechanism (REL-01, REL-02, REL-03, REL-04) — Validated in Phase 2

### Active

- [ ] Add additional LLM providers
- [ ] Enhance admin UI dashboard
- [ ] Add more detailed analytics/usage metrics
- [ ] Implement webhook notifications
- [ ] Add more sophisticated routing rules

### Out of Scope

- Mobile SDKs — defer to future
- GraphQL API — not needed currently
- Real-time WebSocket chat — not needed

## Context

This is an existing Node.js/TypeScript project using Fastify, Drizzle ORM, SQLite, and Redis. The codebase is well-structured with clear separation between providers, adapters, routes, and services. The admin UI is a React/Vite application.

Key architectural patterns established:

- Provider abstraction layer for multi-provider support
- Adapter pattern for format conversion (Anthropic ↔ OpenAI)
- Multi-tenancy service for org/team/user hierarchy
- Redis-backed caching and rate limiting
- Tenant-isolated cache with defense-in-depth (key prefix + entry validation)

## Constraints

- **Tech Stack**: Node.js >= 20.0.0, TypeScript, Fastify, Drizzle ORM, SQLite, Redis
- **API Compatibility**: Must maintain backward compatibility with OpenAI and Anthropic API formats
- **Performance**: Sub-100ms overhead for non-streaming requests

## Key Decisions

| Decision                        | Rationale                                        | Outcome   |
| ------------------------------- | ------------------------------------------------ | --------- |
| Use Drizzle ORM                 | Type-safe database access, SQLite for simplicity | — Pending |
| Redis for caching/rate limiting | Industry standard, well-understood               | — Pending |
| Multi-provider abstraction      | Enable provider flexibility and fallback         | — Pending |
| Dual API format support         | Support both OpenAI and Anthropic clients        | — Pending |
| Tenant-isolated cache keys      | Defense-in-depth: key prefix + entry validation  | Phase 1 ✓ |
| SSE heartbeat for streaming     | Keep connections alive during long responses     | Phase 2 ✓ |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-03-24 after Phase 2 completion_

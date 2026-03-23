# Technology Stack

**Analysis Date:** 2026-03-23

## Languages

**Primary:**

- TypeScript 5.7.3 - Main application language
- ES2022 - Target ECMAScript version

**Secondary:**

- JavaScript (ESM) - Admin UI built with Vite
- CSS - Tailwind CSS for styling

## Runtime

**Environment:**

- Node.js >= 20.0.0 - Required runtime version

**Package Manager:**

- npm - Version from package-lock.json
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**

- Fastify 5.2.0 - HTTP server framework
- Zod 3.24.1 - Schema validation

**Testing:**

- Vitest 4.1.0 - Test runner
- TypeScript ESLint 8.21.0 - Type checking during tests

**Build/Dev:**

- TypeScript 5.7.3 - TypeScript compiler
- tsx 4.19.2 - TypeScript execute for development
- ESLint 9.18.0 - Linting
- Prettier 3.4.2 - Code formatting

## Key Dependencies

**API Clients:**

- `@ai-sdk/openai` 3.0.41 - OpenAI-compatible SDK
- `@ai-sdk/anthropic` 3.0.58 - Anthropic AI SDK
- `@anthropic-ai/sdk` 0.39.0 - Anthropic SDK
- `openai` 4.77.0 - OpenAI Node.js SDK

**Database:**

- `better-sqlite3` 12.8.0 - SQLite driver
- `drizzle-orm` 0.45.1 - ORM
- `drizzle-kit` 0.31.10 - Database migrations (dev)

**Cache/Rate Limiting:**

- `ioredis` 5.10.1 - Redis client

**Server:**

- `@fastify/cors` 10.0.1 - CORS support
- `@fastify/helmet` 13.0.0 - Security headers
- `@fastify/rate-limit` 10.1.1 - Rate limiting

**Logging:**

- `pino` 9.6.0 - Logging framework
- `pino-pretty` 11.3.0 - Pretty print logs

**Validation:**

- `zod` 3.24.1 - Schema validation
- `zod-to-json-schema` 3.24.1 - JSON schema generation

**WebSocket:**

- `ws` 8.18.0 - WebSocket support

**Config:**

- `dotenv` 17.3.1 - Environment variable loading

## Configuration

**Environment:**

- Configuration loaded from `process.env`
- Schema validation via Zod in `src/config/schema.ts`
- Config types defined in `src/config/index.ts`

**Build:**

- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Test configuration
- `eslint.config.mjs` - ESLint configuration
- `.prettierrc` - Prettier configuration

## Platform Requirements

**Development:**

- Node.js >= 20.0.0
- npm (comes with Node)

**Production:**

- Node.js >= 20.0.0
- SQLite (file-based, bundled with better-sqlite3)
- Redis (optional, for caching and rate limiting)

---

_Stack analysis: 2026-03-23_

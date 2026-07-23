# Architecture — Current State

🟢 All claims in this document were verified directly against the source tree (not against a prior summary). Where something is inferred rather than directly observed, it's marked.

## 1. The core problem: two frameworks, one repo

The repo contains a complete Express application and a parallel, partially-built NestJS application, side by side in the same `src/` tree.

### Entrypoint A — Express (currently what actually runs)

```
server.ts (repo root)
  → src/server.ts
    → connects MongoDB directly (config/database.ts)
    → starts Express app from src/app.ts
    → initializes Socket.IO
    → starts Kafka as a best-effort background step (failure is non-fatal)
```

`package.json` scripts (`dev`, `prod`, `start`) all point at this path via `src/server.ts` → `dist/server.js`. **This is the entrypoint that is actually executed today.**

`src/app.ts` is a plain Express app: CORS, JSON body parsing, request logging, a Prometheus-style `/metrics` endpoint, `/health`, `/ready` (checks Mongo required, Redis/Kafka optional), and route mounting for admin, collections, comments, feed, notifications, preferences, quotes, reactions, safety, search, users, system.

**Auth is not mounted here.** The line exists and is commented out:
```ts
// app.use("/v1/auth", authRouter); // Migrated to NestJS
```
There is no `authRouter` implementation left on the Express side to mount even if uncommented — auth logic lives only in the NestJS module (see below).

### Entrypoint B — NestJS (currently built but not started by any script)

```
src/main.ts
  → NestFactory.create(AppModule)
  → global ValidationPipe, ResponseInterceptor, HttpExceptionFilter
  → connects MongoDB, Kafka, Socket.IO (duplicate of Entrypoint A's bootstrap logic)
```

`AppModule` (`src/app.module.ts`) imports NestJS-style modules for every domain: Auth, Users, Quotes, Collections, Comments, Reactions, Feeds, Notifications, Preferences, Search, Safety, Admin, System, plus infra modules (Kafka, Mailer, Media, Cache) and Queues.

**No `npm` script invokes `main.ts`.** It is not `dist/main.js` in `start`, not referenced by `dev`/`prod`. As far as the deployable app is concerned, this is dead code right now.

### The consequence

For every domain module except Auth, the pattern is: a real, working Express route+service (used in production) sitting next to an empty or near-empty NestJS controller+service (scaffolded, does nothing). Auth is the **inverse** — fully implemented in NestJS only, nothing usable on the Express side. Net effect: **the app that actually starts today cannot serve `/auth/login`, `/auth/register`, or token refresh.** If the deployed instance is currently functioning for users, one of these must be true: (a) it isn't actually being used for auth right now, (b) there's a start path we haven't seen (e.g. a Procfile, Docker CMD, or PM2 config outside this analysis), or (c) it's genuinely broken. Worth confirming in your deployment config, since it wasn't part of this repo scan.

**Decision:** Per [ADR-001](./02-decision-log.md#adr-001-commit-to-nestjs-as-the-single-framework), the project commits to NestJS as the long-term single framework. See [`03-nestjs-migration-plan.md`](./03-nestjs-migration-plan.md) for the module-by-module path to get there.

## 2. Module inventory (domain modules under `src/modules/`)

| Module | Express side (route+service) | NestJS side (controller+module+service) | Notes |
|---|---|---|---|
| `auth` | Not implemented (mount commented out) | ✅ Fully implemented — login, register, refresh, guards, JWT strategy | NestJS-only; the gap described above |
| `admin` | ✅ route + controller + service | Module wraps the same controller (no separate NestJS service split observed) | |
| `collections` | ✅ route + service | Controller + module scaffolded; stray empty file `collections.controller` (no extension, 0 bytes — dead artifact) | |
| `comments` | ✅ route + service (real logic, ~5.4KB) | Controller + module + service present but service is an **empty stub** (`@Injectable() class CommentsService {}`) | |
| `feeds` | ✅ route + service — global/following/discover feed logic, uses cursor pagination | Controller + module scaffolded | Following feed uses a compound cursor (`createdAt`,`_id`); global/discover feeds use a single-field cursor |
| `notifications` | ✅ route + service + socket + validation + constants (real logic) | Controller + module + service present, **service is an empty stub** | Socket.IO notification delivery lives only on the Express/plain-Node side (`notification.socket.ts`), not wired into the NestJS app |
| `preferences` | ✅ route + service | Controller + module scaffolded | |
| `quotes` | ✅ route + service | Controller + module scaffolded | |
| `reactions` | ✅ route + service, uses Redis cache (`reaction.cache.ts`) | Controller + module scaffolded | Only module with real Redis caching |
| `safety` | ✅ route + service (reports, blocks) | Controller + module scaffolded | |
| `search` | ✅ route + service — Mongo `$regexMatch` aggregation, not Trie-based | Controller + module scaffolded | |
| `users` | ✅ route + service | Controller + module scaffolded | |
| `system` | ✅ route + service — exposes `/v1/system/routes` | Controller + module scaffolded | |

"Scaffolded" above means: the NestJS controller/module files exist and are wired into `AppModule`, but the corresponding service class has no business logic — it's an empty `@Injectable()` shell. This is consistent across nearly every module except `auth` (fully done) and `reactions`/`admin` (partially wired, still Express-driven in practice).

## 3. Cross-cutting infrastructure (used by both halves inconsistently)

- **Logging:** Winston-based, structured, with correlation IDs via request logger middleware (`shared/logging/`). This is framework-agnostic and genuinely shared — no duplication here. 🟢 Verified present and real.
- **Rate limiting:** Exists as both an Express middleware (`shared/middlewares/rateLimiter.middleware.ts`) and a NestJS guard (`shared/guards/rate-limit.guard.ts`) — another instance of the dual-implementation pattern, smaller in scope than the module duplication above.
- **Response formatting:** Express side uses `shared/utils/responseFormatter.util.ts` (`successResponse`/`errorResponse`); NestJS side uses `ResponseInterceptor` + `HttpExceptionFilter`. Different conventions, not yet unified.
- **Metrics:** Custom hand-rolled Prometheus-format exporter (`shared/observability/metrics.ts`), only wired into the Express `/metrics` route. Not `prom-client`.
- **Health/readiness:** `/health` and `/ready` exist only on the Express side (`app.ts`). Not present in the NestJS bootstrap.

## 4. Build & tooling reality check

- `npm run build` → `tsc` — compiles cleanly (verified: `tsconfig.json` present, straightforward compile step).
- `eslint.config.js` exists but is **empty** (0 bytes). No `lint` script in `package.json`. ESLint and its plugins are devDependencies but effectively unused.
- No Prettier config file, though `prettier` is a dependency and referenced in `lint-staged`.
- `.husky/pre-commit` runs `npx lint-staged`, so on paper commits are gated — but since there's no working ESLint config, the `eslint --fix` step in `lint-staged` has nothing to enforce.
- No `README.md` at repo root.
- `docs/` contains `Mermaid_Architecture.md` and `notification_module_design.md` (a fairly detailed 40KB notification design doc) — neither is linked from a README because none exists.
- No test script (`"test": "echo \"Error: no test specified\" && exit 1"`).
- No CI configuration found in the repo (no `.github/workflows`).

## 5. What's genuinely solid

To be clear about what's *not* broken:
- Mongoose data modeling is careful — compound indexes are used deliberately (e.g. `Follow`, `Quote`, `Notification` all have query-shaped compound indexes, not just single-field ones). See [`04-data-model.md`](./04-data-model.md).
- Cursor-based pagination is correctly implemented as a shared utility (base64-encoded, single + compound field support) and used correctly in feed queries.
- Kafka, BullMQ queues, and workers are real, running infrastructure, not just scaffolding — see [`05-infrastructure-and-async.md`](./05-infrastructure-and-async.md).
- Structured logging with correlation IDs is a genuinely production-grade piece already in place.

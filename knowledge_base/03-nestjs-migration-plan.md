# NestJS Migration Plan

Per [ADR-001](./02-decision-log.md#adr-001-commit-to-nestjs-as-the-single-framework), the target end-state is: `src/main.ts` is the only entrypoint, every domain module's business logic lives in its NestJS service, and `src/server.ts`/`src/app.ts` (Express) are deleted.

🟡 Everything in this document is RECOMMENDED sequencing, not yet executed. Update the status column as work lands, and update [`01-architecture-current-state.md`](./01-architecture-current-state.md) alongside it — don't let this doc and the current-state doc drift apart.

## Guiding rule for migration

**Port logic, don't rewrite it.** The Express `*.service.ts` files contain the real, working business logic (validated by production use). The job is to move that logic into the corresponding NestJS `*.service.ts` (currently an empty stub for most modules), adapted to use Mongoose models via `@InjectModel` (already the pattern `auth.service.ts` and `comments.service.ts`'s constructor use) instead of direct model imports. Only after a module's NestJS service is verified equivalent should its Express route be removed.

## Phase 0 — Close the auth gap immediately

This isn't really "migration" — it's a live bug. Before anything else:
- [ ] Confirm in your actual deployment (Docker/PM2/hosting config, not in this repo) which entrypoint is really running in production. If it's `server.ts`, auth is currently broken for real users.
- [ ] Either temporarily start `main.ts` in deployment, or temporarily restore a minimal Express `authRouter` calling into `AuthService`'s logic, until Phase 2 lands.

## Phase 1 — Bring cross-cutting concerns into the NestJS bootstrap

These currently exist only in `src/app.ts` / `src/server.ts` and have no NestJS equivalent yet:
- [ ] `/health` endpoint
- [ ] `/ready` endpoint (Mongo required, Redis/Kafka optional — same degraded-readiness logic)
- [ ] `/metrics` endpoint (or replace with `prom-client` per roadmap — see [`06-roadmap.md`](./06-roadmap.md))
- [ ] Winston structured logging + correlation ID middleware, applied globally in `main.ts`
- [ ] Socket.IO initialization (`initializeSocket`) — already called in `main.ts`, confirm it's actually reachable by the notification module once that's ported

## Phase 2 — Port domain modules, one at a time

Suggested order: highest-traffic / most load-bearing first, since each cutover is a risk window. Each row becomes "done" when the NestJS service has been verified to reproduce the Express service's behavior (ideally with tests — see [`06-roadmap.md`](./06-roadmap.md) item on test coverage) and the Express route is removed from `app.ts`.

| Order | Module | Current NestJS state | Complexity to port | Notes |
|---|---|---|---|---|
| 1 | `auth` | ✅ Already done | — | Already NestJS-only; just needs to actually be reachable (Phase 0) |
| 2 | `quotes` | Empty stub | Medium | Core entity; most other modules reference it |
| 3 | `users` | Empty stub | Medium | Referenced everywhere; do early |
| 4 | `reactions` | Empty stub, but Express side has real Redis caching logic | Medium-high | Port the Redis TTL cache logic carefully — this is the one module with real caching today |
| 5 | `feeds` | Empty stub | High | Three feed types (global/following/discover), compound cursor logic — port carefully, this is query-heavy |
| 6 | `comments` | Empty stub (has `@InjectModel` wired already) | Medium | Constructor injection already scaffolded correctly |
| 7 | `notifications` | Empty stub | High | Also needs Socket.IO delivery wired in — this module has the most cross-cutting complexity (see the 40KB notification design doc in `docs/`) |
| 8 | `collections` | Empty stub + stray dead file `collections.controller` | Low-medium | Delete the extensionless `collections.controller` file as part of this |
| 9 | `search` | Empty stub | Medium | Consider doing the Trie/autocomplete work (roadmap item) at the same time rather than porting regex search then replacing it right after |
| 10 | `preferences` | Empty stub | Low | |
| 11 | `safety` | Empty stub | Low-medium | |
| 12 | `admin` | Partially wired | Low | |
| 13 | `system` | Empty stub | Low | Exposes `/v1/system/routes` — keep this working through the transition, it's useful for verifying what's live |

## Phase 3 — Decommission Express

- [ ] Delete `src/app.ts`, `src/server.ts`, root `server.ts`
- [ ] Update `package.json` scripts (`dev`, `prod`, `start`) to point at `main.ts`/`dist/main.js`
- [ ] Remove Express-specific shared utilities that have NestJS equivalents (`shared/middlewares/*`, `shared/utils/responseFormatter.util.ts`) once nothing references them
- [ ] Update [`01-architecture-current-state.md`](./01-architecture-current-state.md) to remove the "two frameworks" section entirely — at that point it's just architecture, not a migration story

## Tracking

Update this table as phases complete. This is the fastest way for an AI agent picking up this project later to know exactly what state the migration is in without re-deriving it from the source tree.

| Phase | Status |
|---|---|
| Phase 0 (auth gap) | 🔴 Not started |
| Phase 1 (cross-cutting) | 🔴 Not started |
| Phase 2 (modules) | 🔴 Not started |
| Phase 3 (decommission) | 🔴 Not started |

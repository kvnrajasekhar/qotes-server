# Roadmap

🟡 RECOMMENDED near-term items and 🔵 ROADMAP longer-term direction. Sequenced against verified current state — see [`01-architecture-current-state.md`](./01-architecture-current-state.md) and [`03-nestjs-migration-plan.md`](./03-nestjs-migration-plan.md) for what's actually true today.

## Sequencing logic

The original review (Codex) proposed a 15-item priority list, correct in content but written without knowledge of the dual-framework issue. Building token rotation, a cache policy, or a system-design doc *before* resolving which framework is canonical means doing some of that work twice — once for the module that turns out to be the one that survives, and wasted effort on the one that gets deleted. So this roadmap reorders around that constraint.

## 🟡 Phase A — Foundational correctness (do first, in parallel where marked)

| # | Item | Why it's here and not later |
|---|---|---|
| 1 | **Fix the live auth gap** (see migration plan Phase 0) | Not really "roadmap" — this is a production bug. Blocks everything else in priority. |
| 2 | **NestJS migration Phases 1–3** (see `03-nestjs-migration-plan.md`) | Every other roadmap item below touches a module that currently exists in two places. Building on top of that duplication compounds the problem. |
| 3 | Fix the `reaction.cache.ts` `quoteId`/`quote` field bug | Small, isolated, high-value — silent data correctness bug, independent of migration. Can run in parallel with #2. |
| 4 | Add real ESLint config + `lint`/`lint:fix`/`format`/`format:check` scripts | Can run in parallel with #2 — doesn't depend on framework choice. Do this early so the migration work itself is lint-checked as it lands, not after. |
| 5 | Add `README.md` (architecture, setup, env vars, worker commands, API examples, link to Mermaid diagram) | Can run in parallel. Should reference this `docs/` knowledge base rather than duplicating it. |

## 🟡 Phase B — Security & data hardening (after NestJS migration reaches auth-adjacent modules)

| # | Item | Notes |
|---|---|---|
| 6 | Refresh token rotation | Build this directly in the NestJS `auth` module — it's already the canonical implementation, no need to touch Express. |
| 7 | Redis blacklist / `jti`-based revocation | Depends on #6 being designed first (rotation and revocation share the token-issuance path). |
| 8 | Hash stored refresh tokens (currently stored as plain strings in `Token.refreshToken`) | Not in the original list, but is a natural companion to #6/#7 — flagging it since it was noticed during the data-model review. |
| 9 | Fix remaining pagination inconsistencies (old page-number-based cursor parsing in feed routes, if any remain after migration) | Re-verify this against the *NestJS* feed service once ported — the Express-side issue may or may not carry over depending on how migration is done. |

## 🟡 Phase C — Documentation & contracts

| # | Item | Notes |
|---|---|---|
| 10 | `docs/system-design.md` — full system design (modules, data models, contracts, scale estimates, trade-offs) | This KB's docs 01–05 are the input material for this; system-design.md can be a synthesized, narrative version once the migration is stable, rather than something maintained in parallel with docs that change weekly during migration. |
| 11 | OpenAPI/Swagger for all APIs | Best done *after* the NestJS migration, since NestJS has first-class OpenAPI decorator support (`@nestjs/swagger`) — doing this against the Express routes now means redoing it. |
| 12 | Redis cache policy doc (key naming, TTLs, invalidation, fallback) | Write this once an actual app-wide cache strategy exists (Phase D below) — right now there's one cached feature, not a strategy to document. |

## 🔵 Phase D — Scale & resilience features

| # | Item |
|---|---|
| 13 | App-wide Redis cache strategy (today: only `reactions` is cached) |
| 14 | Trie/autocomplete for usernames, hashtags, quote text (today: Mongo regex search) |
| 15 | Replace hand-rolled metrics exporter with `prom-client` |
| 16 | OpenTelemetry tracing across API, Mongo, Redis, Kafka, BullMQ |
| 17 | Outbox pattern for reliable event publishing (addresses the denormalized-counter consistency gap noted in `04-data-model.md`) |
| 18 | Circuit breakers / retries for external dependencies beyond what's already handled by BullMQ's own retry config |
| 19 | Docker Compose for API + MongoDB + Redis + Kafka + workers |
| 20 | CI pipeline: install → lint → format check → build → test |
| 21 | Test coverage: unit, integration, API contract, worker/job tests (currently: no test script at all) |

## 🔵 Phase E — Service decomposition (X/Twitter-style)

Unchanged in substance from the original review's proposed service breakdown — Auth, User/Profile, Social Graph, Quote/Post, Timeline/Feed, Reaction, Comment, Notification, Search, Media, Safety/Moderation, Analytics, Admin, plus an API Gateway. Restating it here for completeness, but it's explicitly **not actionable** until Phases A–D are done: you can't cleanly split a service that doesn't have a single settled implementation yet. Splitting the dual-framework mess into microservices would just create two dual-framework messes distributed across a network, which is strictly worse.

**When Phase E does become relevant**, the standards from the original review remain sound and should carry forward as-is:
- Event-driven communication for side effects; synchronous APIs only for required user-facing reads/writes
- Timeouts, retries, circuit breakers, fallbacks per external dependency
- Idempotency keys for follow/reaction/notification-job writes
- Outbox pattern for reliable event publishing (this is Phase D item #17, and becomes a prerequisite for Phase E, not just nice-to-have)
- SLO tracking: availability, p95 latency, error rate, queue lag
- Security baseline (token rotation, blacklist, rate limiting, input validation, CORS, secrets management) — Phase B above
- Observability baseline (structured logs, correlation IDs, Prometheus metrics, distributed traces, alerts) — logs/correlation IDs already done; metrics/traces are Phase D

## How to use this roadmap doc going forward

Move items between phases as reality changes, and cross items off with a date and a link/reference to the change, rather than deleting them — this document is also a changelog of engineering priorities over time, useful for anyone (human or AI) trying to understand *why* the codebase looks the way it does at any given point.

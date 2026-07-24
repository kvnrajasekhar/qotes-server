# Decision Log (ADRs)

Format: each entry is a real decision made for this project, with context, the decision, and consequences. Newest at the bottom. Never delete an entry, even if superseded — add a new one that supersedes it and link back.

---

## ADR-001: Commit to NestJS as the single framework

**Date:** 2026-07-22
**Status:** Accepted

**Context:**
The repo contains two parallel backend implementations — a running Express app (`server.ts` → `src/app.ts`) and a mostly-scaffolded NestJS app (`src/main.ts` → `AppModule`). Nearly every domain module exists twice: once as Express route+service (real logic), once as NestJS controller+module+service (usually an empty stub). Auth is the exception — implemented only on the NestJS side, meaning it doesn't currently run at all, since no npm script starts `main.ts`.

This split isn't sustainable: it doubles the surface area for every change, makes "what does the API actually do" ambiguous, and has already produced one real bug (auth unreachable in the running app).

**Decision:**
Standardize on **NestJS** as the framework going forward. `src/main.ts` becomes the entrypoint. `src/server.ts` / `src/app.ts` (the Express app) will be retired once each module has a working NestJS equivalent.

**Rationale (why NestJS over Express, given both exist):**

- Auth — the highest-risk, most security-sensitive module — is already fully built in NestJS. Rebuilding it in Express would mean re-solving JWT strategy, guards, and validation from scratch, in the framework we're trying to move away from.
- NestJS's structure (modules, DI, guards, interceptors, pipes) maps cleanly onto the model-per-domain structure this codebase already has, and gives the app-wide-cache-policy, circuit-breaker, and service-boundary work described in the roadmap a natural home (interceptors/guards) rather than ad hoc Express middleware.
- The project's stated direction — eventual service decomposition — benefits from NestJS's module boundaries being enforced by the framework, not just by folder convention.

**Consequences:**

- Every domain module needs its NestJS service ported from the working Express service (not rewritten from scratch — the Express services are the source of truth for business logic; see [`03-nestjs-migration-plan.md`](./03-nestjs-migration-plan.md)).
- Cross-cutting concerns need to be re-homed: `/health`, `/ready`, `/metrics`, and the Winston/correlation-ID logging currently only exist on the Express side and must be added to the NestJS bootstrap before cutover.
- Socket.IO notification delivery (`notification.socket.ts`) currently isn't wired into the NestJS app at all and needs an explicit integration point.
- Until migration is complete, **the repo is in a transitional state** — the architecture doc reflects this explicitly rather than pretending the migration is finished.

---

## ADR-002: This knowledge base documents current state separately from roadmap

**Date:** 2026-07-22
**Status:** Accepted

**Context:** An earlier AI-generated review (Codex) of this repo was thorough on feature-presence checks but did not catch the dual-framework/dead-entrypoint issue, and blended "what exists," "what's recommended," and "what a mature X-style backend eventually looks like" into a single flat set of tables.

**Decision:** This KB enforces a strict separation — 🟢 CURRENT / 🟡 RECOMMENDED / 🔵 ROADMAP — in every document, and every CURRENT claim must be traceable to something actually observed in the source tree, not inferred from a prior report about the source tree.

**Consequences:** Slower to write, but each doc can be trusted at face value by a human or an AI agent picking up the project later, without needing to re-verify from scratch.

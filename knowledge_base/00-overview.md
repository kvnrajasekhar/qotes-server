# Qotes Server — Knowledge Base

**Repository:** [kvnrajasekhar/qotes-server](https://github.com/kvnrajasekhar/qotes-server)
**Last verified against source:** 2026-07-22 (commit at time of writing on `main`)
**Purpose of this KB:** a single source of truth for what the system *actually is*, as opposed to what it was intended to be or what it should become. Every document here is written to be read by both human engineers and AI coding agents, so it separates three things explicitly, always:

- 🟢 **CURRENT** — verified against the code, as of the date above
- 🟡 **RECOMMENDED** — a change we've agreed on but not yet built
- 🔵 **ROADMAP** — a future direction, not yet started, not yet fully decided in detail

If a document doesn't label something, assume it's 🟢 CURRENT.

## What Qotes is

A quote-sharing social media backend — think "X/Twitter, but the post is a quote." Users create/share quotes, follow each other, react, comment, save to collections, search, and get notified of activity. Node.js/TypeScript, MongoDB via Mongoose, Redis, Kafka, BullMQ.

## Documents in this KB

| Doc | Covers |
|---|---|
| [`01-architecture-current-state.md`](./01-architecture-current-state.md) | What's actually running today, module by module, verified against source |
| [`02-decision-log.md`](./02-decision-log.md) | Architecture Decision Records (ADRs) — why we chose what we chose |
| [`03-nestjs-migration-plan.md`](./03-nestjs-migration-plan.md) | Module-by-module plan to finish the Express → NestJS migration |
| [`04-data-model.md`](./04-data-model.md) | Mongoose schemas, relationships, indexes, as they exist in code |
| [`05-infrastructure-and-async.md`](./05-infrastructure-and-async.md) | Redis, Kafka, BullMQ, workers — current scope and gaps |
| [`06-roadmap.md`](./06-roadmap.md) | Production-hygiene priorities + future microservice split |

## How to keep this KB honest

1. **Never document intent as if it were fact.** If a module has a controller but the service is an empty stub, the KB says so — it doesn't describe the intended behavior as if it exists.
2. **Verify against source before writing, not against a prior report about the source.** Reports (including AI-generated ones) can be stale, incomplete, or based on a partial reading of the repo. This KB was built by directly pulling and reading the repository tree, not by trusting a summary.
3. **Update the decision log, not just the architecture doc, when something changes.** The "why" matters as much as the "what" for a codebase with two migrations already visible in its history.
4. **Re-verify this KB whenever architecture changes materially** — new module, framework change, entrypoint change, new external dependency. A stale KB is worse than no KB because it's trusted by default.

## The single most important fact about the current state

As of this writing, **the codebase contains two parallel backend framework implementations** — a running Express app and a mostly-stubbed, not-currently-started NestJS app — and **auth is implemented only in the unstarted NestJS half**, meaning the currently-running server cannot authenticate users. This is resolved by decision: see [ADR-001](./02-decision-log.md#adr-001-commit-to-nestjs-as-the-single-framework). Full detail in [`01-architecture-current-state.md`](./01-architecture-current-state.md).

# Data Model

🟢 Extracted directly from `src/models/*.ts`. MongoDB via Mongoose. All collections listed here are real, in-use schemas — this is not a proposed model.

## Entity overview

```
User ──< Follow >── User
User ──< Quote (creator)
User ──< Comment (author)
User ──< Reaction (user)
User ──< Collection (owner) ──< CollectionItem >── Quote
User ──< UserBlock (blocker/blocked) >── User
User ──< Report (reporterId) ── target(Quote|User|Comment)
User ──< Notification (recipient/sender)
User ──< Token (userId)
User ──< UserContentPreference (userId)
Quote ──< Comment (quote)
Quote ──< Reaction (quote)
Quote ──< Quote (parentQuoteId, self-ref for requotes)
```

## Collections

### User (`user.model.ts`)
Core identity. `username`/`email` unique. `password` has `select: false` (excluded from queries by default — good practice, confirmed in code). Denormalized `stats` subdocument (`followerCount`, `followingCount`, `quoteCount`) — counters maintained by application logic elsewhere, not by Mongo triggers (worth confirming they're kept in sync consistently as the module migration proceeds).
Indexes: `{username,email}`, `{createdAt:-1}`, `{isBanned,createdAt:-1}`, plus two indexes supporting sort-by-popularity (`stats.followerCount`, `stats.quoteCount`).

### Quote (`quote.model.ts`)
Fields (first ~30 lines, truncated in extraction but core fields present): `text`, `author`, `creator` (ref User, optional — suggests quotes can exist without an app user, e.g. seeded/curated content), `category`, `hashtags[]`, `likes`/`saves`/`requotes` counters, `reactions` (Map<string,number> — a denormalized reaction-count cache), `isRequote`, `parentQuoteId` (self-reference).
Notable index: `{creator:1, parentQuoteId:1}` unique **with a partial filter** `{isRequote:true}` — this correctly prevents a user from requoting the same quote twice while not constraining regular quotes. This is a deliberately well-designed index, not a default.
Other indexes support feed queries (`createdAt:-1`, `_id:-1`), category browsing, and hashtag search.

### Reaction (`reaction.model.ts`)
`quote` + `user` + `type`, unique compound index preventing duplicate reactions per user per quote. Reaction types: `like`, `inspriring`, `thoughtful`, `realatable`, `eye-opening` — **note the typos are in the actual enum values** (`inspriring`, `realatable`), not just display strings. These are stored values; renaming them is a breaking change to existing data, not just a copy fix. Flagging so it isn't "fixed" accidentally during migration without a data-migration step.

### Comment (`comment.model.ts`)
Supports threaded replies via `parentComment` self-reference and a denormalized `repliesCount`. Soft-delete pattern (`isDeleted`/`deletedAt`) rather than hard delete. `likes` stored as an array of User ObjectIds directly on the comment (not a separate collection) — fine at low scale, worth revisiting if comment likes get high-cardinality (see roadmap re: denormalization limits).

### Follow (`follow.model.ts`)
`follower`/`following`, unique compound index preventing duplicate follows. Six indexes total on a simple two-field model — clearly tuned for the specific feed/follower-list/following-list query patterns (unidirectional lookups in both directions, both with and without `createdAt` sort, both with and without `_id` tie-breaker for cursor pagination). This is a well-thought-out index set, not default indexing.

### Collection / CollectionItem (`collections.model.ts`, `collectionItem.model.ts`)
Standard collection-of-quotes pattern: `Collection` (owned by a user, `isPrivate`/`isDefault` flags) and a join table `CollectionItem` (collectionId + quoteId, unique compound index, addedAt).

### Notification (`notification.model.ts`)
The most heavily-indexed model (8 single-field + 3 compound indexes) — consistent with it being read-heavy (unread counts, chronological feeds) and write-heavy (every reaction/follow/comment can generate one). Uses `Map<Schema.Types.Mixed>` for flexible `metadata`. Has a **commented-out TTL index** for 90-day auto-cleanup — present in code but not active. `// @ts-nocheck` at the top of this file, and it does a `require()` of `notification.constants` inside a TS file rather than an `import` — inconsistent with the rest of the codebase's style, worth cleaning up during the NestJS port.

### Token (`token.model.ts`)
Stores `refreshToken` (plain string, not hashed — worth flagging as a hardening item alongside the refresh-rotation work), optional `passwordResetToken`, and has a **TTL index on `createdAt` at 7 days** (`expires: "7d"`) plus a separate TTL on `expiresAt`. This is where refresh-token rotation and JTI-based revocation (see roadmap) would attach.

### UserBlock / Report / ReportStats (`block.model.ts`, `report.model.ts`, `reportStats.model.ts`)
Standard safety/moderation primitives. `Report` targets `QUOTE | USER | COMMENT` via a polymorphic `targetId`+`targetType` pair (not a Mongo discriminator — application-level polymorphism). `ReportStats` is a denormalized rollup (`totalReports`, `status`) keyed uniquely per target, presumably maintained by a worker or service on report creation — confirm this is atomic (e.g. `$inc`) rather than read-modify-write when reviewing the safety module during migration.

### UserContentPreference (`userContentPreference.model.ts`)
"Not interested" / content-tuning signals per user, per target (`QUOTE|AUTHOR|TAG`), with a reason enum. Feeds into feed-ranking/filtering presumably (worth confirming this is actually consumed by `feeds` module logic, not just recorded and unused).

## Cross-cutting observations

- **No soft-delete convention across the board.** `Comment` has `isDeleted`, but `Quote`, `User`, etc. don't show the same pattern in what was extracted — worth deciding on a consistent policy (hard delete vs. soft delete) as part of the system-design doc, rather than each module choosing independently.
- **Counter fields are denormalized everywhere** (`User.stats`, `Quote.likes/saves/requotes`, `Comment.repliesCount`, `ReportStats.totalReports`) with no visible outbox/event-sourcing mechanism keeping them consistent yet. This is exactly the kind of thing the roadmap's "outbox pattern" recommendation is meant to address — right now, consistency depends on every write path correctly updating every counter, by convention, not by mechanism.
- **Index design overall is a strength of this codebase**, not a weakness — several models show deliberate, query-shaped compound indexes (Follow, Quote's partial-filter unique index, Notification). This is worth preserving/documenting as a standard when new modules are added, so it doesn't erode as more people (or AI agents) touch the codebase.

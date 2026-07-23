# Infrastructure & Async Systems

🟢 Verified against `src/infrastructure/`, `src/shared/queues/`, `src/workers/`.

## Redis

**Actual usage is narrower than "app-wide cache strategy" — it's one feature.** Confirmed usage:
- `reaction.cache.ts` — TTL-based (3600s) cache of reaction breakdowns per quote, using Redis hashes. Also backs a custom Lua-scripted atomic command (`redis.defineCommand("updateReaction", ...)`) for atomic increment/decrement across a type change (e.g. user switches their reaction from "like" to "thoughtful").
- A second custom Lua command, `slidingWindowRateLimit`, is also registered in `redis.utils.ts` — used for rate limiting (not caching). Confirms the "rate limiting" cross-cutting concern is Redis-backed, not in-memory.
- BullMQ uses Redis as its connection backend for all four queues (see below) — this is infrastructure usage, not application caching.

**🐛 Bug found:** `getReactionBreakdown`'s cache-repair path aggregates `Reaction.aggregate([{ $match: { quoteId: ... } }])`, but the `Reaction` schema's field is `quote`, not `quoteId` (confirmed in `reaction.model.ts`). This match will never find documents, so the "repair from DB when cache is empty/expired" path silently returns `{ breakdown: {}, total: 0 }` instead of actually repairing. It's wrapped in a try/catch that also swallows real errors the same way, so this fails silently rather than throwing. **This is a real bug, not a hypothetical** — worth fixing independent of the NestJS migration, since it means reaction counts can silently zero out after a cache miss.

No other module touches Redis directly for caching. The 🟡 "app-wide Redis cache strategy" from the roadmap doesn't exist yet — this is accurately a 🔵 future item, not partially-done.

## Kafka

Two topics only, defined in `topics.ts`:
- `auth-events`
- `reaction-events`

One consumer exists: `src/infrastructure/kafka/consumers/reaction.consumer.ts`. There's a `dlq` (dead-letter queue) directory present, suggesting DLQ handling was at least started — worth checking its contents when doing the Kafka-related roadmap work, not assumed complete here since it wasn't fully inspected.

Kafka startup is **non-fatal** in `src/server.ts` — if Kafka is unavailable, the Express app still starts. This matches the "Optional" classification in the failure-isolation table from the earlier review, and is one of the few failure-isolation behaviors that's actually implemented rather than aspirational.

**Scope gap:** the module list describes notifications, feed fanout, and analytics as candidates for event-driven communication via Kafka, but only auth and reactions currently publish/consume events. Feed fanout, notification triggering, etc. currently happen via **direct service calls and BullMQ jobs**, not Kafka events. This isn't wrong — BullMQ is a legitimate choice for those — but it means "event-driven via Kafka" is not yet the actual pattern for most side effects; it's the pattern for two specific things.

## BullMQ — four real, running queues

All four are real (not stubs), each with its own file under `src/shared/queues/`, backed by Redis:

| Queue | File | Purpose | Notable config |
|---|---|---|---|
| `image-generation-queue` | `imageGeneration.queue.ts` | Rendering quote images (e.g. for sharing) | Gated behind `IMAGE_GENERATION_ENABLED` env flag — if unset, jobs are silently skipped (logged, not queued) rather than erroring |
| `quote-notifications-queue` | `quoteNotifications.queue.ts` | Notification dispatch | Gated behind `NOTIFICATIONS_ENABLED`; has a rate limiter (max 80/sec) — the only queue with a limiter |
| `scheduled-cron-queue` | `scheduledCron.queue.ts` | Cron-style scheduled jobs | No feature flag — always active |
| `content-sync-queue` | `contentSync.queue.ts` | Content sync (external source sync, presumably) | No feature flag — always active |

All four share a consistent retry/cleanup convention: exponential backoff, `removeOnComplete: {age: 3600}`, `removeOnFail: {age: 86400}` — this consistency is a good sign, it means whoever built these queues was following a deliberate pattern rather than copy-pasting inconsistently.

**Note:** comments in the code say `// QueueScheduler removed in newer bullmq versions` — this is leftover commentary from a past BullMQ upgrade, not a current TODO. Harmless, but worth cleaning up as drive-by tech debt during the migration.

## Workers

`src/workers/` — six workers, one per major async job type:
- `contentSync.worker.ts`
- `cron.worker.ts`
- `imageGeneration.worker.ts`
- `loginFollowerCache.worker.ts` (name suggests it warms/maintains follower-count caches — worth confirming exact behavior when this module is touched)
- `notification.worker.ts`
- `reaction.worker.ts`

These correspond directly to the four BullMQ queues plus two workers without an obviously matching queue file (`loginFollowerCache`, and the queue-vs-worker split for reactions since reactions is Kafka-consumed, not just queue-driven) — worth a closer pass to fully map worker↔queue/topic 1:1 when this area gets touched, rather than assuming the mapping here.

## Failure isolation — current vs. proposed

| Dependency | Proposed behavior (roadmap) | Actually implemented today |
|---|---|---|
| MongoDB | Required, fails readiness | ✅ Matches — `/ready` checks Mongo |
| Redis | Optional/degraded | Partially — BullMQ *requires* Redis to function (queues won't work without it); only the reaction-cache read path degrades gracefully (via try/catch, though see the bug above) |
| Kafka | Optional | ✅ Matches — non-fatal startup |
| BullMQ workers | Optional, job stays queued | Plausible but not verified — didn't confirm graceful handling of queue-add failures across all call sites |
| Media/Cloudinary | Feature-specific | ✅ Matches — image generation is explicitly flag-gated and no-ops cleanly when disabled |
| Notifications | Optional | ✅ Matches — flag-gated the same way as image generation |

This table itself should be re-verified once the NestJS migration lands, since queue/cache initialization logic will move.

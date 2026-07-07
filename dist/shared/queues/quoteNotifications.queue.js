"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueNotificationJob = exports.quoteNotificationsQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_utils_1 = require("../utils/redis.utils");
const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === "true";
const queueName = "quote-notifications-queue";
let quoteNotificationsQueue;
if (NOTIFICATIONS_ENABLED) {
  exports.quoteNotificationsQueue = quoteNotificationsQueue =
    new bullmq_1.Queue(queueName, {
      connection: redis_utils_1.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
      limiter: {
        max: 80,
        duration: 1000,
      },
    });
}
const enqueueNotificationJob = async (payload, opts = {}) => {
  if (!NOTIFICATIONS_ENABLED) {
    console.info(
      "Notifications disabled; skipping notification enqueue",
      payload.type,
    );
    return null;
  }
  return quoteNotificationsQueue?.add(
    payload.type || "send-notification",
    payload,
    {
      priority: opts.priority || 2,
      removeOnComplete: opts.removeOnComplete || { age: 3600 },
      removeOnFail: opts.removeOnFail || { age: 86400 },
      ...opts,
    },
  );
};
exports.enqueueNotificationJob = enqueueNotificationJob;
//# sourceMappingURL=quoteNotifications.queue.js.map

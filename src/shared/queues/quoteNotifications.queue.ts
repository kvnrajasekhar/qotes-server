import { Queue } from "bullmq";
import { redis } from "../utils/redis.utils";

const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === "true";
const queueName = "quote-notifications-queue";

let quoteNotificationsQueue: Queue | undefined;
if (NOTIFICATIONS_ENABLED) {
  // QueueScheduler removed in newer bullmq versions
  quoteNotificationsQueue = new Queue(queueName, {
    connection: redis,
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
    } as any,
  });
}

const enqueueNotificationJob = async (payload: any, opts: any = {}) => {
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

export { quoteNotificationsQueue, enqueueNotificationJob };

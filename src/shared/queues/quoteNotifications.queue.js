const { Queue, QueueScheduler } = require("bullmq");
const { redis } = require("../utils/redis.utils");

const queueName = "quote-notifications-queue";

new QueueScheduler(queueName, { connection: redis });

const quoteNotificationsQueue = new Queue(queueName, {
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
  },
});

const enqueueNotificationJob = async (payload, opts = {}) => {
  return quoteNotificationsQueue.add(
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

module.exports = {
  quoteNotificationsQueue,
  enqueueNotificationJob,
};

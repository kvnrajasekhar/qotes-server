import { Queue } from "bullmq";
import { redis } from "../utils/redis.utils";

const queueName = "content-sync-queue";

// QueueScheduler removed in newer bullmq versions

const contentSyncQueue = new Queue(queueName, {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

const addContentSyncJob = async (payload: any, opts: any = {}) => {
  return contentSyncQueue.add(payload.type || "content-sync", payload, {
    priority: opts.priority || 2,
    removeOnComplete: opts.removeOnComplete || { age: 3600 },
    removeOnFail: opts.removeOnFail || { age: 86400 },
    ...opts,
  });
};

export { contentSyncQueue, addContentSyncJob };

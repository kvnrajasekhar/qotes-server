"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addContentSyncJob = exports.contentSyncQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_utils_1 = require("../utils/redis.utils");
const queueName = "content-sync-queue";
const contentSyncQueue = new bullmq_1.Queue(queueName, {
  connection: redis_utils_1.redis,
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
exports.contentSyncQueue = contentSyncQueue;
const addContentSyncJob = async (payload, opts = {}) => {
  return contentSyncQueue.add(payload.type || "content-sync", payload, {
    priority: opts.priority || 2,
    removeOnComplete: opts.removeOnComplete || { age: 3600 },
    removeOnFail: opts.removeOnFail || { age: 86400 },
    ...opts,
  });
};
exports.addContentSyncJob = addContentSyncJob;
//# sourceMappingURL=contentSync.queue.js.map

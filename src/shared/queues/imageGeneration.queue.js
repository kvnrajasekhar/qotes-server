const { Queue, QueueScheduler } = require("bullmq");
const { redis } = require("../utils/redis.utils");

const queueName = "image-generation-queue";

new QueueScheduler(queueName, { connection: redis });

const imageGenerationQueue = new Queue(queueName, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 500,
    },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

const addImageGenerationJob = async (payload, opts = {}) => {
  return imageGenerationQueue.add("render-image", payload, {
    priority: opts.priority || 1,
    attempts: opts.attempts || 3,
    backoff: opts.backoff || { type: "exponential", delay: 500 },
    removeOnComplete: opts.removeOnComplete || { age: 3600 },
    removeOnFail: opts.removeOnFail || { age: 86400 },
    ...opts,
  });
};

module.exports = {
  imageGenerationQueue,
  addImageGenerationJob,
};

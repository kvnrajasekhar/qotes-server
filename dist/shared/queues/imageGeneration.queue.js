"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addImageGenerationJob = exports.imageGenerationQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_utils_1 = require("../utils/redis.utils");
const IMAGE_GENERATION_ENABLED =
  process.env.IMAGE_GENERATION_ENABLED === "true";
const queueName = "image-generation-queue";
let imageGenerationQueue;
if (IMAGE_GENERATION_ENABLED) {
  exports.imageGenerationQueue = imageGenerationQueue = new bullmq_1.Queue(
    queueName,
    {
      connection: redis_utils_1.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 500,
        },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    },
  );
}
const addImageGenerationJob = async (payload, opts = {}) => {
  if (!IMAGE_GENERATION_ENABLED) {
    console.info(
      "Image generation disabled; skipping image generation job",
      payload,
    );
    return null;
  }
  return imageGenerationQueue?.add("render-image", payload, {
    priority: opts.priority || 1,
    attempts: opts.attempts || 3,
    backoff: opts.backoff || { type: "exponential", delay: 500 },
    removeOnComplete: opts.removeOnComplete || { age: 3600 },
    removeOnFail: opts.removeOnFail || { age: 86400 },
    ...opts,
  });
};
exports.addImageGenerationJob = addImageGenerationJob;
//# sourceMappingURL=imageGeneration.queue.js.map

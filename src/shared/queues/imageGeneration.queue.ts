import { Queue } from "bullmq";
import { redis } from "../utils/redis.utils";

const IMAGE_GENERATION_ENABLED =
  process.env.IMAGE_GENERATION_ENABLED === "true";
const queueName = "image-generation-queue";

let imageGenerationQueue: Queue | undefined;
if (IMAGE_GENERATION_ENABLED) {
  // QueueScheduler removed in newer bullmq versions
  imageGenerationQueue = new Queue(queueName, {
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
}

const addImageGenerationJob = async (payload: any, opts: any = {}) => {
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

export { imageGenerationQueue, addImageGenerationJob };

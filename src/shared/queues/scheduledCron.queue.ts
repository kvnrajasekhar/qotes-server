import { Queue } from "bullmq";
import { redis } from "../utils/redis.utils";

const queueName = "scheduled-cron-queue";

// QueueScheduler removed in newer bullmq versions

const scheduledCronQueue = new Queue(queueName, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

const addScheduledJob = async (name: string, payload: any, opts: any = {}) => {
  return scheduledCronQueue.add(name, payload, {
    priority: opts.priority || 2,
    removeOnComplete: opts.removeOnComplete || { age: 3600 },
    removeOnFail: opts.removeOnFail || { age: 86400 },
    ...opts,
  });
};

export { scheduledCronQueue, addScheduledJob };

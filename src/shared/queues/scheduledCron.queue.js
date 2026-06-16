const { Queue, QueueScheduler } = require("bullmq");
const { redis } = require("../utils/redis.utils");

const queueName = "scheduled-cron-queue";

new QueueScheduler(queueName, { connection: redis });

const scheduledCronQueue = new Queue(queueName, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

const addScheduledJob = async (name, payload, opts = {}) => {
  return scheduledCronQueue.add(name, payload, {
    priority: opts.priority || 2,
    removeOnComplete: opts.removeOnComplete || { age: 3600 },
    removeOnFail: opts.removeOnFail || { age: 86400 },
    ...opts,
  });
};

module.exports = {
  scheduledCronQueue,
  addScheduledJob,
};

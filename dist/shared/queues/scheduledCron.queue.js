"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addScheduledJob = exports.scheduledCronQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_utils_1 = require("../utils/redis.utils");
const queueName = "scheduled-cron-queue";
const scheduledCronQueue = new bullmq_1.Queue(queueName, {
    connection: redis_utils_1.redis,
    defaultJobOptions: {
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
    },
});
exports.scheduledCronQueue = scheduledCronQueue;
const addScheduledJob = async (name, payload, opts = {}) => {
    return scheduledCronQueue.add(name, payload, {
        priority: opts.priority || 2,
        removeOnComplete: opts.removeOnComplete || { age: 3600 },
        removeOnFail: opts.removeOnFail || { age: 86400 },
        ...opts,
    });
};
exports.addScheduledJob = addScheduledJob;
//# sourceMappingURL=scheduledCron.queue.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const bullmq_1 = require("bullmq");
const redis_utils_1 = require("../shared/utils/redis.utils");
const logger_util_1 = __importDefault(require("../shared/utils/logger.util"));
const scheduledCron_queue_1 = require("../shared/queues/scheduledCron.queue");
const contentSync_queue_1 = require("../shared/queues/contentSync.queue");
const quoteNotifications_queue_1 = require("../shared/queues/quoteNotifications.queue");
const quote_model_1 = __importDefault(require("../models/quote.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
dotenv_1.default.config();
const queueName = "scheduled-cron-queue";
const worker = new bullmq_1.Worker(queueName, async (job) => {
    logger_util_1.default.info("Running scheduled job", {
        queue: queueName,
        jobId: job.id,
        name: job.name,
        data: job.data,
    });
    if (job.name === "daily-quote-of-day") {
        const latestQuote = await quote_model_1.default.findOne({ isHiddenBySystem: false })
            .sort({ createdAt: -1 })
            .lean();
        if (!latestQuote) {
            logger_util_1.default.warn("No quote available for daily quote job");
            return { skipped: true };
        }
        const recipients = await user_model_1.default.find({
            email: { $exists: true, $ne: "" },
            isBanned: false,
        })
            .limit(100)
            .lean();
        await Promise.all(recipients.map((recipient) => (0, quoteNotifications_queue_1.enqueueNotificationJob)({
            type: "generic-email",
            recipientId: recipient._id,
            subject: "Daily Quote of the Day",
            body: `<p>Hi ${recipient.username || "friend"},</p><p>Here is today's featured quote:</p><blockquote>${latestQuote.text}</blockquote><p>— ${latestQuote.author}</p>`,
        }, { attempts: 2, backoff: { type: "exponential", delay: 2000 } })));
        return { delivered: recipients.length };
    }
    if (job.name === "delayed-onboarding") {
        const { userId, step } = job.data;
        if (!userId) {
            throw new Error("delayed-onboarding job requires userId");
        }
        const recipient = await user_model_1.default.findById(userId).lean();
        if (!recipient || !recipient.email) {
            return { skipped: true };
        }
        return (0, quoteNotifications_queue_1.enqueueNotificationJob)({
            type: "generic-email",
            recipientId: recipient._id,
            subject: "Welcome to Qotes",
            body: `<p>Hi ${recipient.username || "there"},</p><p>This is your next onboarding step: ${step || "Start exploring quotes."}</p>`,
        }, { attempts: 1, backoff: { type: "exponential", delay: 1000 } });
    }
    if (job.name === "content-sync-trigger") {
        await (0, contentSync_queue_1.addContentSyncJob)({ type: "content-sync" });
        return { triggered: true };
    }
    throw new Error(`Unknown scheduled job: ${job.name}`);
}, {
    connection: redis_utils_1.redis,
    concurrency: 2,
    lockDuration: 120000,
});
worker.on("completed", (job) => {
    logger_util_1.default.info("Scheduled job completed", {
        queue: queueName,
        jobId: job.id,
        name: job.name,
        returnValue: job.returnvalue,
    });
});
worker.on("failed", (job, err) => {
    logger_util_1.default.error("Scheduled job failed", {
        queue: queueName,
        jobId: job?.id,
        name: job?.name,
        failedReason: err?.message,
        stack: err?.stack,
    });
});
worker.on("stalled", (job) => {
    logger_util_1.default.warn("Scheduled job stalled", {
        queue: queueName,
        jobId: job?.id,
        name: job?.name,
    });
});
worker.on("error", (error) => {
    logger_util_1.default.error("Scheduled cron worker error", { queue: queueName, error });
});
const dailyCron = process.env.DAILY_QUOTE_CRON || "0 8 * * *";
const contentSyncCron = process.env.CONTENT_SYNC_CRON || "0 */6 * * *";
(async () => {
    try {
        await (0, scheduledCron_queue_1.addScheduledJob)("daily-quote-of-day", {}, {
            jobId: "daily-quote-of-day",
            repeat: { cron: dailyCron, tz: process.env.TIMEZONE || "UTC" },
            removeOnComplete: { age: 3600 },
            removeOnFail: { age: 86400 },
        });
        await (0, scheduledCron_queue_1.addScheduledJob)("content-sync-trigger", {}, {
            jobId: "content-sync-trigger",
            repeat: { cron: contentSyncCron, tz: process.env.TIMEZONE || "UTC" },
            removeOnComplete: { age: 3600 },
            removeOnFail: { age: 86400 },
        });
        logger_util_1.default.info("Scheduled cron repeatable jobs created", {
            dailyCron,
            contentSyncCron,
        });
    }
    catch (error) {
        logger_util_1.default.error("Failed to add repeatable scheduled jobs", { error });
    }
})();
//# sourceMappingURL=cron.worker.js.map
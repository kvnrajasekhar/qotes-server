require("dotenv").config();
const { Worker } = require("bullmq");
const { redis } = require("../shared/utils/redis.utils");
const logger = require("../shared/utils/logger.util");
const { addScheduledJob } = require("../shared/queues/scheduledCron.queue");
const { addContentSyncJob } = require("../shared/queues/contentSync.queue");
const {
  enqueueNotificationJob,
} = require("../shared/queues/quoteNotifications.queue");
const Quote = require("../models/quote.model");
const User = require("../models/user.model");

const queueName = "scheduled-cron-queue";

const worker = new Worker(
  queueName,
  async (job) => {
    logger.info("Running scheduled job", {
      queue: queueName,
      jobId: job.id,
      name: job.name,
      data: job.data,
    });

    if (job.name === "daily-quote-of-day") {
      const latestQuote = await Quote.findOne({ isHiddenBySystem: false })
        .sort({ createdAt: -1 })
        .lean();
      if (!latestQuote) {
        logger.warn("No quote available for daily quote job");
        return { skipped: true };
      }

      const recipients = await User.find({
        email: { $exists: true, $ne: "" },
        isBanned: false,
      })
        .limit(100)
        .lean();

      await Promise.all(
        recipients.map((recipient) =>
          enqueueNotificationJob(
            {
              type: "generic-email",
              recipientId: recipient._id,
              subject: "Daily Quote of the Day",
              body: `<p>Hi ${recipient.username || "friend"},</p><p>Here is today’s featured quote:</p><blockquote>${latestQuote.text}</blockquote><p>— ${latestQuote.author}</p>`,
            },
            { attempts: 2, backoff: { type: "exponential", delay: 2000 } },
          ),
        ),
      );

      return { delivered: recipients.length };
    }

    if (job.name === "delayed-onboarding") {
      const { userId, step } = job.data;
      if (!userId) {
        throw new Error("delayed-onboarding job requires userId");
      }

      const recipient = await User.findById(userId).lean();
      if (!recipient || !recipient.email) {
        return { skipped: true };
      }

      return enqueueNotificationJob(
        {
          type: "generic-email",
          recipientId: recipient._id,
          subject: "Welcome to Qotes",
          body: `<p>Hi ${recipient.username || "there"},</p><p>This is your next onboarding step: ${step || "Start exploring quotes."}</p>`,
        },
        { attempts: 1, backoff: { type: "exponential", delay: 1000 } },
      );
    }

    if (job.name === "content-sync-trigger") {
      await addContentSyncJob({ type: "content-sync" });
      return { triggered: true };
    }

    throw new Error(`Unknown scheduled job: ${job.name}`);
  },
  {
    connection: redis,
    concurrency: 2,
    lockDuration: 120000,
  },
);

worker.on("completed", (job) => {
  logger.info("Scheduled job completed", {
    queue: queueName,
    jobId: job.id,
    name: job.name,
    returnValue: job.returnvalue,
  });
});

worker.on("failed", (job, err) => {
  logger.error("Scheduled job failed", {
    queue: queueName,
    jobId: job?.id,
    name: job?.name,
    failedReason: err?.message,
    stack: err?.stack,
  });
});

worker.on("stalled", (job) => {
  logger.warn("Scheduled job stalled", {
    queue: queueName,
    jobId: job?.id,
    name: job?.name,
  });
});

worker.on("error", (error) => {
  logger.error("Scheduled cron worker error", { queue: queueName, error });
});

const dailyCron = process.env.DAILY_QUOTE_CRON || "0 8 * * *";
const contentSyncCron = process.env.CONTENT_SYNC_CRON || "0 */6 * * *";

(async () => {
  try {
    await addScheduledJob(
      "daily-quote-of-day",
      {},
      {
        jobId: "daily-quote-of-day",
        repeat: { cron: dailyCron, tz: process.env.TIMEZONE || "UTC" },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    );
    await addScheduledJob(
      "content-sync-trigger",
      {},
      {
        jobId: "content-sync-trigger",
        repeat: { cron: contentSyncCron, tz: process.env.TIMEZONE || "UTC" },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    );
    logger.info("Scheduled cron repeatable jobs created", {
      dailyCron,
      contentSyncCron,
    });
  } catch (error) {
    logger.error("Failed to add repeatable scheduled jobs", { error });
  }
})();

import dotenv from "dotenv";
import { Worker } from "bullmq";
import { redis } from "../shared/utils/redis.utils";
import logger from "../shared/utils/logger.util";
import { addScheduledJob } from "../shared/queues/scheduledCron.queue";
import { addContentSyncJob } from "../shared/queues/contentSync.queue";
import { enqueueNotificationJob } from "../shared/queues/quoteNotifications.queue";
import Quote from "../models/quote.model";
import User from "../models/user.model";

dotenv.config();

const queueName = "scheduled-cron-queue";

const worker = new Worker(
  queueName,
  async (job: any) => {
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
        recipients.map((recipient: any) =>
          enqueueNotificationJob(
            {
              type: "generic-email",
              recipientId: recipient._id,
              subject: "Daily Quote of the Day",
              body: `<p>Hi ${recipient.username || "friend"},</p><p>Here is today's featured quote:</p><blockquote>${latestQuote.text}</blockquote><p>— ${latestQuote.author}</p>`,
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

worker.on("completed", (job: any) => {
  logger.info("Scheduled job completed", {
    queue: queueName,
    jobId: job.id,
    name: job.name,
    returnValue: job.returnvalue,
  });
});

worker.on("failed", (job: any, err: Error) => {
  logger.error("Scheduled job failed", {
    queue: queueName,
    jobId: job?.id,
    name: job?.name,
    failedReason: err?.message,
    stack: err?.stack,
  });
});

worker.on("stalled", (job: any) => {
  logger.warn("Scheduled job stalled", {
    queue: queueName,
    jobId: job?.id,
    name: job?.name,
  });
});

worker.on("error", (error: Error) => {
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
  } catch (error: any) {
    logger.error("Failed to add repeatable scheduled jobs", { error });
  }
})();

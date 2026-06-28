import dotenv from "dotenv";
import fetch from "node-fetch";
import { Worker } from "bullmq";
import { redis } from "../shared/utils/redis.utils";
import logger from "../shared/utils/logger.util";
import Quote from "../models/quote.model";

dotenv.config();

const queueName = "content-sync-queue";

const worker = new Worker(
  queueName,
  async (job: any) => {
    logger.info("Content sync job started", {
      queue: queueName,
      jobId: job.id,
      data: job.data,
    });

    const sourceUrl = process.env.CONTENT_SYNC_URL;
    if (!sourceUrl) {
      throw new Error("CONTENT_SYNC_URL is not configured");
    }

    const response = await fetch(sourceUrl, { timeout: 30000 } as any);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch content sync source: ${response.status} ${response.statusText}`,
      );
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error(
        "Invalid content sync response format: expected JSON array",
      );
    }

    const syncResults: any[] = [];
    for (const item of payload) {
      if (!item.text) {
        continue;
      }

      const quoteData = {
        text: item.text,
        author: item.author || "Anonymous",
        category: item.category || "external",
        hashtags: item.hashtags || [],
        taggedUsers: item.taggedUsers || [],
      };

      const syncedQuote = await Quote.findOneAndUpdate(
        { text: quoteData.text, author: quoteData.author },
        { $setOnInsert: quoteData },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      syncResults.push({
        quoteId: syncedQuote._id.toString(),
        createdAt: syncedQuote.createdAt,
      });
    }

    logger.info("Content sync job completed", {
      queue: queueName,
      jobId: job.id,
      syncedCount: syncResults.length,
    });

    return { syncedCount: syncResults.length };
  },
  {
    connection: redis,
    concurrency: 2,
    lockDuration: 300000,
  },
);

worker.on("completed", (job: any) => {
  logger.info("Content sync job completed", {
    queue: queueName,
    jobId: job.id,
    returnValue: job.returnvalue,
  });
});

worker.on("failed", (job: any, err: Error) => {
  logger.error("Content sync job failed", {
    queue: queueName,
    jobId: job?.id,
    failedReason: err?.message,
    stack: err?.stack,
  });
});

worker.on("stalled", (job: any) => {
  logger.warn("Content sync job stalled", {
    queue: queueName,
    jobId: job?.id,
  });
});

worker.on("error", (error: Error) => {
  logger.error("Content sync worker error", { queue: queueName, error });
});

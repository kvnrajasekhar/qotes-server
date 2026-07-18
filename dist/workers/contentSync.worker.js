"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const bullmq_1 = require("bullmq");
const redis_utils_1 = require("../shared/utils/redis.utils");
const logger_util_1 = __importDefault(require("../shared/utils/logger.util"));
const quote_model_1 = __importDefault(require("../models/quote.model"));
dotenv_1.default.config();
const queueName = "content-sync-queue";
const worker = new bullmq_1.Worker(queueName, async (job) => {
    logger_util_1.default.info("Content sync job started", {
        queue: queueName,
        jobId: job.id,
        data: job.data,
    });
    const sourceUrl = process.env.CONTENT_SYNC_URL;
    if (!sourceUrl) {
        throw new Error("CONTENT_SYNC_URL is not configured");
    }
    const response = await (0, node_fetch_1.default)(sourceUrl, { timeout: 30000 });
    if (!response.ok) {
        throw new Error(`Failed to fetch content sync source: ${response.status} ${response.statusText}`);
    }
    const payload = await response.json();
    if (!Array.isArray(payload)) {
        throw new Error("Invalid content sync response format: expected JSON array");
    }
    const syncResults = [];
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
        const syncedQuote = await quote_model_1.default.findOneAndUpdate({ text: quoteData.text, author: quoteData.author }, { $setOnInsert: quoteData }, { upsert: true, new: true, setDefaultsOnInsert: true });
        syncResults.push({
            quoteId: syncedQuote._id.toString(),
            createdAt: syncedQuote.createdAt,
        });
    }
    logger_util_1.default.info("Content sync job completed", {
        queue: queueName,
        jobId: job.id,
        syncedCount: syncResults.length,
    });
    return { syncedCount: syncResults.length };
}, {
    connection: redis_utils_1.redis,
    concurrency: 2,
    lockDuration: 300000,
});
worker.on("completed", (job) => {
    logger_util_1.default.info("Content sync job completed", {
        queue: queueName,
        jobId: job.id,
        returnValue: job.returnvalue,
    });
});
worker.on("failed", (job, err) => {
    logger_util_1.default.error("Content sync job failed", {
        queue: queueName,
        jobId: job?.id,
        failedReason: err?.message,
        stack: err?.stack,
    });
});
worker.on("stalled", (job) => {
    logger_util_1.default.warn("Content sync job stalled", {
        queue: queueName,
        jobId: job?.id,
    });
});
worker.on("error", (error) => {
    logger_util_1.default.error("Content sync worker error", { queue: queueName, error });
});
//# sourceMappingURL=contentSync.worker.js.map
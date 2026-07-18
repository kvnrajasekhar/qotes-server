"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const sharp_1 = __importDefault(require("sharp"));
const bullmq_1 = require("bullmq");
const redis_utils_1 = require("../shared/utils/redis.utils");
const logger_util_1 = __importDefault(require("../shared/utils/logger.util"));
const quote_model_1 = __importDefault(require("../models/quote.model"));
const cloudinary_service_1 = __importDefault(require("../infrastructure/media/cloudinary.service"));
dotenv_1.default.config();
const queueName = "image-generation-queue";
const cpuCount = os_1.default.cpus().length || 2;
const concurrency = Math.min(Math.max(2, cpuCount - 1), 4);
const renderQuoteSvg = (text, author = "Anonymous") => {
    const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const escapedAuthor = author
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect x="60" y="60" width="1080" height="510" rx="40" ry="40" fill="#111827" opacity="0.95" />
  <foreignObject x="100" y="120" width="1000" height="360">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Inter, system-ui, sans-serif; color: #f8fafc; font-size: 48px; line-height: 1.2; white-space: pre-wrap; overflow-wrap: break-word;">
      ${escapedText}
    </div>
  </foreignObject>
  <text x="100" y="520" fill="#94a3b8" font-family="Inter, system-ui, sans-serif" font-size="32">— ${escapedAuthor}</text>
</svg>`;
};
const worker = new bullmq_1.Worker(queueName, async (job) => {
    logger_util_1.default.info("Starting image generation job", {
        queue: queueName,
        jobId: job.id,
        data: job.data,
    });
    const { quoteId, outputFolder = "uploads/quote-images" } = job.data;
    const quote = await quote_model_1.default.findById(quoteId).lean();
    if (!quote) {
        throw new Error(`Quote not found: ${quoteId}`);
    }
    const svg = renderQuoteSvg(quote.text || "", quote.author || "Anonymous");
    const outputDir = path_1.default.resolve(process.cwd(), outputFolder);
    await fs_1.promises.mkdir(outputDir, { recursive: true });
    const outputPath = path_1.default.join(outputDir, `${quoteId}-${Date.now()}.png`);
    await (0, sharp_1.default)(Buffer.from(svg)).png({ quality: 90 }).toFile(outputPath);
    let uploadedUrl;
    try {
        uploadedUrl = await cloudinary_service_1.default.uploadImage(outputPath, "qotes-app/shareable-quotes");
    }
    finally {
        await fs_1.promises.rm(outputPath, { force: true }).catch(() => { });
    }
    logger_util_1.default.info("Completed image generation job", {
        queue: queueName,
        jobId: job.id,
        uploadedUrl,
    });
    return { imageUrl: uploadedUrl };
}, {
    connection: redis_utils_1.redis,
    concurrency,
    lockDuration: 600000,
});
worker.on("completed", (job) => {
    logger_util_1.default.info("Image generation job completed", {
        queue: queueName,
        jobId: job.id,
        returnValue: job.returnvalue,
    });
});
worker.on("failed", (job, err) => {
    logger_util_1.default.error("Image generation job failed", {
        queue: queueName,
        jobId: job?.id,
        failedReason: err?.message,
        stack: err?.stack,
    });
});
worker.on("stalled", (job) => {
    logger_util_1.default.warn("Image generation job stalled", {
        queue: queueName,
        jobId: job?.id,
    });
});
worker.on("error", (error) => {
    logger_util_1.default.error("Image generation worker error", { queue: queueName, error });
});
//# sourceMappingURL=imageGeneration.worker.js.map
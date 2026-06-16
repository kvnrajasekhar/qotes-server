require("dotenv").config();
const os = require("os");
const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");
const { Worker } = require("bullmq");
const { redis } = require("../shared/utils/redis.utils");
const logger = require("../shared/utils/logger.util");
const Quote = require("../models/quote.model");
const cloudinaryService = require("../infrastructure/media/cloudinary.service");

const queueName = "image-generation-queue";
const cpuCount = os.cpus().length || 2;
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

const worker = new Worker(
  queueName,
  async (job) => {
    logger.info("Starting image generation job", {
      queue: queueName,
      jobId: job.id,
      data: job.data,
    });

    const { quoteId, outputFolder = "uploads/quote-images" } = job.data;
    const quote = await Quote.findById(quoteId).lean();
    if (!quote) {
      throw new Error(`Quote not found: ${quoteId}`);
    }

    const svg = renderQuoteSvg(quote.text || "", quote.author || "Anonymous");
    const outputDir = path.resolve(process.cwd(), outputFolder);
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `${quoteId}-${Date.now()}.png`);
    await sharp(Buffer.from(svg)).png({ quality: 90 }).toFile(outputPath);

    let uploadedUrl;
    try {
      uploadedUrl = await cloudinaryService.uploadImage(
        outputPath,
        "qotes-app/shareable-quotes",
      );
    } finally {
      await fs.rm(outputPath, { force: true }).catch(() => {});
    }

    logger.info("Completed image generation job", {
      queue: queueName,
      jobId: job.id,
      uploadedUrl,
    });

    return { imageUrl: uploadedUrl };
  },
  {
    connection: redis,
    concurrency,
    lockDuration: 600000,
  },
);

worker.on("completed", (job) => {
  logger.info("Image generation job completed", {
    queue: queueName,
    jobId: job.id,
    returnValue: job.returnvalue,
  });
});

worker.on("failed", (job, err) => {
  logger.error("Image generation job failed", {
    queue: queueName,
    jobId: job?.id,
    failedReason: err?.message,
    stack: err?.stack,
  });
});

worker.on("stalled", (job) => {
  logger.warn("Image generation job stalled", {
    queue: queueName,
    jobId: job?.id,
  });
});

worker.on("error", (error) => {
  logger.error("Image generation worker error", { queue: queueName, error });
});

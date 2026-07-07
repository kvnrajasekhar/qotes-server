"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const bullmq_1 = require("bullmq");
const redis_utils_1 = require("../shared/utils/redis.utils");
const logger_util_1 = __importDefault(require("../shared/utils/logger.util"));
const email_service_1 = require("../infrastructure/mailer/email.service");
const user_model_1 = __importDefault(require("../models/user.model"));
const quote_model_1 = __importDefault(require("../models/quote.model"));
const notification_service_1 = __importDefault(
  require("../modules/notifications/notification.service"),
);
const notification_constants_1 = require("../modules/notifications/notification.constants");
dotenv_1.default.config();
const queueName = "quote-notifications-queue";
const worker = new bullmq_1.Worker(
  queueName,
  async (job) => {
    logger_util_1.default.info("Processing notification job", {
      queue: queueName,
      jobId: job.id,
      name: job.name,
      data: job.data,
    });
    const {
      type,
      recipientId,
      actorId,
      quoteId,
      email,
      link,
      subject,
      body,
      html,
      text,
    } = job.data;
    switch (type) {
      case "password-reset-email": {
        if (!email || !link) {
          throw new Error("Missing email or reset link for password reset job");
        }
        return (0, email_service_1.sendEmail)({
          to: email,
          subject: subject || "Reset your password",
          html:
            body ||
            `<p>Please reset your password <a href="${link}">here</a>.</p>`,
          text: `Reset your password: ${link}`,
        });
      }
      case "quote-like": {
        if (!recipientId || !actorId || !quoteId) {
          throw new Error("Missing required quote-like payload fields");
        }
        const recipient = await user_model_1.default
          .findById(recipientId)
          .lean();
        const actor = await user_model_1.default.findById(actorId).lean();
        const quote = await quote_model_1.default.findById(quoteId).lean();
        if (!recipient || !actor || !quote) {
          throw new Error(
            "Quote-like notification actor/recipient/quote missing",
          );
        }
        try {
          await notification_service_1.default.createNotification({
            recipient: recipientId,
            sender: actorId,
            type: notification_constants_1.NOTIFICATION_TYPES.LIKE_QUOTE,
            message: `${actor.username || actor.email || "Someone"} liked your quote`,
            referenceId: quoteId,
            referenceType: notification_constants_1.REFERENCE_TYPES.QUOTE,
            metadata: {
              quoteText: quote.text,
              quoteAuthor: quote.author,
              senderName: actor.username,
            },
          });
        } catch (notifError) {
          logger_util_1.default.error(
            "Failed to create in-app notification for quote-like",
            {
              error: notifError.message,
            },
          );
        }
        const notificationBody = `Your quote was liked by ${actor.username || actor.email || "someone"}.`;
        const emailBody = `<p>Hi ${recipient.username || ""},</p><p>${notificationBody}</p><p>Quote: ${quote.text}</p>`;
        if (recipient.email) {
          return (0, email_service_1.sendEmail)({
            to: recipient.email,
            subject: subject || "Your quote got a new like",
            html: body || emailBody,
            text: `${notificationBody}\n\n${quote.text}`,
          });
        }
        logger_util_1.default.info(
          "Skipping email for quote-like notification because recipient has no email",
          {
            recipientId,
            quoteId,
          },
        );
        return { skipped: true, emailSkipped: true };
      }
      case "user-follow": {
        if (!recipientId || !actorId) {
          throw new Error("Missing required user-follow payload fields");
        }
        const recipient = await user_model_1.default
          .findById(recipientId)
          .lean();
        const actor = await user_model_1.default.findById(actorId).lean();
        if (!recipient || !actor) {
          throw new Error(
            "User-follow notification actor or recipient missing",
          );
        }
        try {
          await notification_service_1.default.createNotification({
            recipient: recipientId,
            sender: actorId,
            type: notification_constants_1.NOTIFICATION_TYPES.FOLLOW_USER,
            message: `${actor.username || actor.email || "Someone"} started following you`,
            referenceId: actorId,
            referenceType: notification_constants_1.REFERENCE_TYPES.USER,
            metadata: {
              senderName: actor.username,
              senderUsername: actor.username,
            },
          });
        } catch (notifError) {
          logger_util_1.default.error(
            "Failed to create in-app notification for user-follow",
            {
              error: notifError.message,
            },
          );
        }
        const notificationBody = `${actor.username || actor.email || "Someone"} started following you.`;
        const emailBody = `<p>Hi ${recipient.username || ""},</p><p>${notificationBody}</p>`;
        if (recipient.email) {
          return (0, email_service_1.sendEmail)({
            to: recipient.email,
            subject: subject || "You have a new follower",
            html: body || emailBody,
            text: notificationBody,
          });
        }
        logger_util_1.default.info(
          "Skipping email for follow notification because recipient has no email",
          {
            recipientId,
          },
        );
        return { skipped: true, emailSkipped: true };
      }
      case "generic-email": {
        const recipient = recipientId
          ? await user_model_1.default.findById(recipientId).lean()
          : null;
        const targetEmail = email || recipient?.email;
        if (!targetEmail) {
          throw new Error("Missing email address for generic email job");
        }
        return (0, email_service_1.sendEmail)({
          to: targetEmail,
          subject: subject || "Notification from Qotes",
          html:
            html || body || `<p>${body || "You have a new notification."}</p>`,
          text: text || body || "You have a new notification.",
        });
      }
      default:
        throw new Error(`Unsupported notification job type: ${type}`);
    }
  },
  {
    connection: redis_utils_1.redis,
    concurrency: 5,
    lockDuration: 120000,
  },
);
worker.on("completed", (job) => {
  logger_util_1.default.info("Notification job completed", {
    queue: queueName,
    jobId: job.id,
    returnValue: job.returnvalue,
  });
});
worker.on("failed", (job, err) => {
  logger_util_1.default.error("Notification job failed", {
    queue: queueName,
    jobId: job?.id,
    failedReason: err?.message,
    stack: err?.stack,
  });
});
worker.on("stalled", (job) => {
  logger_util_1.default.warn("Notification job stalled", {
    queue: queueName,
    jobId: job?.id,
  });
});
worker.on("error", (error) => {
  logger_util_1.default.error("Notification worker error", {
    queue: queueName,
    error,
  });
});
//# sourceMappingURL=notification.worker.js.map

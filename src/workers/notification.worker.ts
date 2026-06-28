import dotenv from "dotenv";
import { Worker } from "bullmq";
import { redis } from "../shared/utils/redis.utils";
import logger from "../shared/utils/logger.util";
import { sendEmail } from "../infrastructure/mailer/email.service";
import User from "../models/user.model";
import Quote from "../models/quote.model";
import { createNotification } from "../modules/notifications/notification.service";
import {
  NOTIFICATION_TYPES,
  REFERENCE_TYPES,
} from "../modules/notifications/notification.constants";

dotenv.config();

const queueName = "quote-notifications-queue";

const worker = new Worker(
  queueName,
  async (job: any) => {
    logger.info("Processing notification job", {
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
        return sendEmail({
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

        const recipient = await User.findById(recipientId).lean();
        const actor = await User.findById(actorId).lean();
        const quote = await Quote.findById(quoteId).lean();

        if (!recipient || !actor || !quote) {
          throw new Error(
            "Quote-like notification actor/recipient/quote missing",
          );
        }

        try {
          await createNotification({
            recipient: recipientId,
            sender: actorId,
            type: NOTIFICATION_TYPES.LIKE_QUOTE,
            message: `${actor.username || actor.email || "Someone"} liked your quote`,
            referenceId: quoteId,
            referenceType: REFERENCE_TYPES.QUOTE,
            metadata: {
              quoteText: quote.text,
              quoteAuthor: quote.author,
              senderName: actor.username,
            },
          });
        } catch (notifError: any) {
          logger.error("Failed to create in-app notification for quote-like", {
            error: notifError.message,
          });
        }

        const notificationBody = `Your quote was liked by ${actor.username || actor.email || "someone"}.`;
        const emailBody = `<p>Hi ${recipient.username || ""},</p><p>${notificationBody}</p><p>Quote: ${quote.text}</p>`;

        if (recipient.email) {
          return sendEmail({
            to: recipient.email,
            subject: subject || "Your quote got a new like",
            html: body || emailBody,
            text: `${notificationBody}\n\n${quote.text}`,
          });
        }

        logger.info(
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

        const recipient = await User.findById(recipientId).lean();
        const actor = await User.findById(actorId).lean();

        if (!recipient || !actor) {
          throw new Error(
            "User-follow notification actor or recipient missing",
          );
        }

        try {
          await createNotification({
            recipient: recipientId,
            sender: actorId,
            type: NOTIFICATION_TYPES.FOLLOW_USER,
            message: `${actor.username || actor.email || "Someone"} started following you`,
            referenceId: actorId,
            referenceType: REFERENCE_TYPES.USER,
            metadata: {
              senderName: actor.username,
              senderUsername: actor.username,
            },
          });
        } catch (notifError: any) {
          logger.error("Failed to create in-app notification for user-follow", {
            error: notifError.message,
          });
        }

        const notificationBody = `${actor.username || actor.email || "Someone"} started following you.`;
        const emailBody = `<p>Hi ${recipient.username || ""},</p><p>${notificationBody}</p>`;

        if (recipient.email) {
          return sendEmail({
            to: recipient.email,
            subject: subject || "You have a new follower",
            html: body || emailBody,
            text: notificationBody,
          });
        }

        logger.info(
          "Skipping email for follow notification because recipient has no email",
          {
            recipientId,
          },
        );
        return { skipped: true, emailSkipped: true };
      }
      case "generic-email": {
        const recipient = recipientId
          ? await User.findById(recipientId).lean()
          : null;
        const targetEmail = email || recipient?.email;

        if (!targetEmail) {
          throw new Error("Missing email address for generic email job");
        }

        return sendEmail({
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
    connection: redis,
    concurrency: 5,
    lockDuration: 120000,
  },
);

worker.on("completed", (job: any) => {
  logger.info("Notification job completed", {
    queue: queueName,
    jobId: job.id,
    returnValue: job.returnvalue,
  });
});

worker.on("failed", (job: any, err: Error) => {
  logger.error("Notification job failed", {
    queue: queueName,
    jobId: job?.id,
    failedReason: err?.message,
    stack: err?.stack,
  });
});

worker.on("stalled", (job: any) => {
  logger.warn("Notification job stalled", {
    queue: queueName,
    jobId: job?.id,
  });
});

worker.on("error", (error: Error) => {
  logger.error("Notification worker error", { queue: queueName, error });
});

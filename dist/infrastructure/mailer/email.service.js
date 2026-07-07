"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_config_1 = require("../../config/nodemailer.config");
const logger_util_1 = __importDefault(
  require("../../shared/utils/logger.util"),
);
const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error("Email recipient is required");
  }
  const mailOptions = {
    from: process.env.EMAIL,
    to,
    subject,
    text: text || html,
    html: html || text,
  };
  try {
    const result = await nodemailer_config_1.transporter.sendMail(mailOptions);
    logger_util_1.default.info("Email sent", {
      service: "email-service",
      to,
      subject,
      messageId: result.messageId,
    });
    return result;
  } catch (error) {
    logger_util_1.default.error("Failed to send email", {
      service: "email-service",
      to,
      subject,
      error: error.message,
    });
    throw error;
  }
};
exports.sendEmail = sendEmail;
//# sourceMappingURL=email.service.js.map

import { transporter } from "../../config/nodemailer.config";
import logger from "../../shared/utils/logger.util";

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

const sendEmail = async ({ to, subject, text, html }: EmailOptions) => {
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
    const result = await transporter.sendMail(mailOptions);
    logger.info("Email sent", {
      service: "email-service",
      to,
      subject,
      messageId: result.messageId,
    });
    return result;
  } catch (error: any) {
    logger.error("Failed to send email", {
      service: "email-service",
      to,
      subject,
      error: error.message,
    });
    throw error;
  }
};

export { sendEmail };

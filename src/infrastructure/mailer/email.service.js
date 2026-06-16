const { transporter } = require("../../config/nodemailer.config");
const logger = require("../../shared/utils/logger.util");

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
    const result = await transporter.sendMail(mailOptions);
    logger.info("Email sent", {
      service: "email-service",
      to,
      subject,
      messageId: result.messageId,
    });
    return result;
  } catch (error) {
    logger.error("Failed to send email", {
      service: "email-service",
      to,
      subject,
      error: error.message,
    });
    throw error;
  }
};

module.exports = {
  sendEmail,
};

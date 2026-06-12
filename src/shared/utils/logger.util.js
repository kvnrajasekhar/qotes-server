const { createLogger, format, transports } = require("winston");

const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const isProduction = process.env.NODE_ENV === "production";

const sharedFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.splat(),
  format.metadata({ fillExcept: ["message", "level", "timestamp", "label"] }),
);

const consoleFormat = isProduction
  ? format.combine(sharedFormat, format.json())
  : format.combine(
      sharedFormat,
      format.colorize({ all: true }),
      format.printf(({ timestamp, level, message, stack, metadata }) => {
        const meta =
          metadata && Object.keys(metadata).length
            ? ` ${JSON.stringify(metadata)}`
            : "";
        return stack
          ? `${timestamp} ${level}: ${message} - ${stack}${meta}`
          : `${timestamp} ${level}: ${message}${meta}`;
      }),
    );

const logger = createLogger({
  level: LOG_LEVEL,
  format: consoleFormat,
  transports: [
    new transports.Console({ stderrLevels: ["error"], handleExceptions: true }),
  ],
  exitOnError: false,
});

logger.stream = {
  write(message) {
    const trimmed = message.trim();
    if (trimmed) {
      logger.info(trimmed);
    }
  },
};

module.exports = logger;

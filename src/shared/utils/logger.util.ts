import { createLogger, format, transports } from "winston";

const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const isProduction = process.env.NODE_ENV === "production";

/**
 * Safely stringify objects that may contain circular references.
 */
const safeStringify = (obj: unknown): string => {
  const seen = new WeakSet();

  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }

    return value;
  });
};

const sharedFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.splat(),
  format.metadata({
    fillExcept: ["message", "level", "timestamp", "label"],
  }),
);

const consoleFormat = isProduction
  ? format.combine(sharedFormat, format.json())
  : format.combine(
      sharedFormat,
      format.colorize({ all: true }),
      format.printf(({ timestamp, level, message, stack, metadata }) => {
        const meta =
          metadata && Object.keys(metadata).length
            ? ` ${safeStringify(metadata)}`
            : "";

        return stack
          ? `${timestamp} ${level}: ${message} - ${stack}${meta}`
          : `${timestamp} ${level}: ${message}${meta}`;
      }),
    );

const baseLogger = createLogger({
  level: LOG_LEVEL,
  format: consoleFormat,
  transports: [
    new transports.Console({
      stderrLevels: ["error"],
      handleExceptions: true,
    }),
  ],
  exitOnError: false,
});

// Add Morgan-compatible stream without conflicting with Logger.stream()
const logger = Object.assign(baseLogger, {
  morganStream: {
    write(message: string) {
      const trimmed = message.trim();
      if (trimmed) {
        baseLogger.info(trimmed);
      }
    },
  },
});

export default logger;

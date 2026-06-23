/**
 * Winston Logger Configuration
 *
 * ARCHITECTURE:
 * - DEV: Colorized console output for human readability
 * - PROD (Modular): Structured JSON to console + file rotation with 14-day retention
 * - FUTURE (Microservices): Pure JSON stdout + distributed tracing metadata
 */

const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const { AsyncLocalStorage } = require("async_hooks");

// ==================== ASYNC LOCAL STORAGE FOR TRACE IDs ====================
const asyncLocalStorage = new AsyncLocalStorage();

const getTraceId = () => {
  const context = asyncLocalStorage.getStore();
  return context?.traceId;
};

const withTraceId = (traceId, callback) => {
  return asyncLocalStorage.run({ traceId }, callback);
};

// ==================== LOG FORMATTING ====================

const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(
    ({ timestamp, level, message, service, stack, ...meta }) => {
      const logObj = {
        timestamp,
        level,
        service: service || "unknown-service",
        message,
      };

      const traceId = getTraceId();
      if (traceId) {
        logObj.traceId = traceId;
      }

      if (stack) {
        logObj.stack = stack;
      }

      if (Object.keys(meta).length > 0) {
        logObj.metadata = meta;
      }

      return JSON.stringify(logObj);
    },
  ),
);

const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(
    ({ timestamp, level, message, service, stack, ...meta }) => {
      const traceId = getTraceId();
      const traceIdStr = traceId ? ` [${traceId}]` : "";
      const serviceStr = service ? ` [${service}]` : "";
      const stackStr = stack ? `\n${stack}` : "";
      const metaStr =
        Object.keys(meta).length > 0
          ? `\n${JSON.stringify(meta, null, 2)}`
          : "";

      return `${timestamp} ${level}${serviceStr}${traceIdStr}: ${message}${stackStr}${metaStr}`;
    },
  ),
);

// ==================== TRANSPORT CONFIGURATION ====================

const createLogger = (serviceName = "default-service") => {
  const transports = [];

  // Clean string variables to handle unexpected environment whitespace
  const env = (process.env.NODE_ENV || "development").trim();
  const isProduction = env === "production";

  // Explicitly check for file logging or default to true on production
  const enableFileLogging =
    (process.env.ENABLE_FILE_LOGGING || "").trim().toLowerCase() === "true" ||
    isProduction;

  console.log(
    `--- LOGGER DEBUG [${serviceName}]: NODE_ENV='${process.env.NODE_ENV}', ENABLE_FILE_LOGGING='${process.env.ENABLE_FILE_LOGGING}', Computed Flag=${enableFileLogging} ---`,
  );

  const logsDir = path.resolve(__dirname, "../../../logs");
  console.log(`--- FILESYSTEM TARGET PATH: '${logsDir}' ---`);

  // Always append the standard Console transport based on environment
  transports.push(
    new winston.transports.Console({
      format: isProduction ? productionFormat : developmentFormat,
      level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    }),
  );

  // ============== CONDITIONAL FILE LOGGING ==============
  if (enableFileLogging) {
    // File rotation transport - General logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, "application-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "14d",
        zippedArchive: true,
        format: productionFormat, // Files are cleaner and highly indexable as JSON
        level: process.env.LOG_LEVEL || "info",
      }),
    );

    // File rotation transport - Error logs only
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, "errors", "error-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "14d",
        zippedArchive: true,
        format: productionFormat,
        level: "error",
      }),
    );
  }

  // ==================== CREATE LOGGER INSTANCE ====================
  return winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    defaultMeta: { service: serviceName },
    transports,
    exceptionHandlers: [
      new winston.transports.Console({
        format: isProduction ? productionFormat : developmentFormat,
      }),
    ],
    rejectionHandlers: [
      new winston.transports.Console({
        format: isProduction ? productionFormat : developmentFormat,
      }),
    ],
  });
};

module.exports = {
  createLogger,
  getTraceId,
  withTraceId,
  asyncLocalStorage,
};

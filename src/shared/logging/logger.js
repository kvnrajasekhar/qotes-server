/**
 * Winston Logger Configuration
 *
 * ARCHITECTURE:
 * - DEV: Colorized console output for human readability
 * - PROD (Modular): Structured JSON to console + file rotation with 14-day retention
 * - FUTURE (Microservices): Pure JSON stdout + distributed tracing metadata
 *
 * Every log automatically includes:
 *   - timestamp (ISO 8601)
 *   - level (info, error, warn, debug)
 *   - service (module/service identifier)
 *   - message
 *   - traceId (for correlation tracking across services)
 *   - stack (auto-extracted from Error objects)
 */

const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const { AsyncLocalStorage } = require("async_hooks");

// ==================== ASYNC LOCAL STORAGE FOR TRACE IDs ====================
// Stores correlation ID per async context (request lifecycle)
const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Get current trace/correlation ID from async context
 * @returns {string|undefined} Current trace ID or undefined
 */
const getTraceId = () => {
  const context = asyncLocalStorage.getStore();
  return context?.traceId;
};

/**
 * Run async function within a trace context
 * @param {string} traceId - Unique correlation identifier
 * @param {Function} callback - Async function to execute
 */
const withTraceId = (traceId, callback) => {
  return asyncLocalStorage.run({ traceId }, callback);
};

// ==================== LOG FORMATTING ====================

/**
 * Production JSON formatter - Structured, machine-readable, cloud-ready
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }), // Extract stack traces from Error objects
  winston.format.splat(), // Support for %s, %d etc
  winston.format.printf(
    ({ timestamp, level, message, service, stack, ...meta }) => {
      const logObj = {
        timestamp,
        level,
        service: service || "unknown-service",
        message,
      };

      // Include traceId if available (for distributed tracing)
      const traceId = getTraceId();
      if (traceId) {
        logObj.traceId = traceId;
      }

      // Include stack trace if error
      if (stack) {
        logObj.stack = stack;
      }

      // Include any additional metadata
      if (Object.keys(meta).length > 0) {
        logObj.metadata = meta;
      }

      return JSON.stringify(logObj);
    },
  ),
);

/**
 * Development format - Colorized, human-friendly
 */
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

/**
 * Create logger instance with appropriate transports based on environment
 */
const createLogger = (serviceName = "default-service") => {
  const transports = [];
  const isDevelopment = process.env.NODE_ENV !== "production";
  const isProduction = process.env.NODE_ENV === "production";
  const logsDir = path.join(process.cwd(), "logs");

  // ============== DEVELOPMENT ==============
  if (isDevelopment) {
    transports.push(
      new winston.transports.Console({
        format: developmentFormat,
        level: process.env.LOG_LEVEL || "debug",
      }),
    );
  }

  // ============== PRODUCTION ==============
  if (isProduction) {
    // Console transport (for cloud aggregators like Fluent Bit, DataDog, ELK stack)
    transports.push(
      new winston.transports.Console({
        format: productionFormat,
        level: process.env.LOG_LEVEL || "info",
      }),
    );

    // File rotation transport - General logs
    // Pattern: logs/application-2025-01-15.log
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, "application-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m", // Rotate if file exceeds 20MB
        maxFiles: "14d", // Retain for 14 days
        zippedArchive: true, // Compress archived files
        format: productionFormat,
        level: process.env.LOG_LEVEL || "info",
      }),
    );

    // File rotation transport - Error logs only
    // Pattern: logs/errors/error-2025-01-15.log
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

  // ============== FALLBACK (if no transports configured) ==============
  if (transports.length === 0) {
    transports.push(
      new winston.transports.Console({
        format: developmentFormat,
      }),
    );
  }

  // ==================== CREATE LOGGER INSTANCE ====================
  return winston.createLogger({
    level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
    defaultMeta: { service: serviceName },
    transports,
    // Prevent unhandled exceptions from crashing the process
    exceptionHandlers: [
      new winston.transports.Console({
        format: developmentFormat,
      }),
    ],
    // Handle uncaught promise rejections
    rejectionHandlers: [
      new winston.transports.Console({
        format: developmentFormat,
      }),
    ],
  });
};

// ==================== EXPORT ====================
module.exports = {
  createLogger,
  getTraceId,
  withTraceId,
  asyncLocalStorage,
};

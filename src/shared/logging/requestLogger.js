/**
 * Express Request Logger Middleware
 *
 * Features:
 * - Captures HTTP request lifecycle (method, URL, status code, response time)
 * - Generates/extracts unique Correlation ID (X-Correlation-ID header)
 * - Stores correlation ID in async context for automatic inclusion in all logs
 * - Tracks response time with millisecond precision
 * - Logs request/response metadata for debugging and monitoring
 */

const { v4: uuidv4 } = require("uuid");
const { createLogger, withTraceId } = require("./logger");

const logger = createLogger("request-logger");

/**
 * Request Logger Middleware
 *
 * Usage in Express:
 *   const { requestLoggerMiddleware } = require('./src/shared/logging/requestLogger');
 *   app.use(requestLoggerMiddleware);
 */
const requestLoggerMiddleware = (req, res, next) => {
  // ============== STEP 1: EXTRACT OR GENERATE CORRELATION ID ==============
  // Check if correlation ID exists in header (from upstream service/client)
  let traceId = req.headers["x-correlation-id"] || req.headers["x-trace-id"];

  // Generate new correlation ID if not provided
  if (!traceId) {
    traceId = `${Date.now()}-${uuidv4()}`;
  }

  // Attach to request object for access in route handlers
  req.traceId = traceId;
  req.correlationId = traceId; // Alternative naming convention

  // Add to response headers (for client/upstream services to track)
  res.setHeader("X-Correlation-ID", traceId);
  res.setHeader("X-Trace-ID", traceId);

  // ============== STEP 2: RECORD REQUEST TIMING ==============
  const requestStart = Date.now();

  // ============== STEP 3: INTERCEPT RESPONSE ==============
  // Capture the original res.end to log after response is sent
  const originalEnd = res.end;
  res.end = function (...args) {
    const responseTime = Date.now() - requestStart;

    // Call original end
    originalEnd.apply(res, args);

    // ============== STEP 4: LOG REQUEST WITHIN TRACE CONTEXT ==============
    // This ensures all logs generated during request handling include the traceId
    withTraceId(traceId, () => {
      const logData = {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        correlationId: traceId,
      };

      // Determine log level based on status code
      if (res.statusCode >= 500) {
        logger.error("HTTP Request", {
          ...logData,
          errorStatus: true,
        });
      } else if (res.statusCode >= 400) {
        logger.warn("HTTP Request", {
          ...logData,
          clientError: true,
        });
      } else {
        logger.info("HTTP Request", logData);
      }
    });
  };

  // ============== STEP 5: WRAP next() IN TRACE CONTEXT ==============
  // Ensures all async handlers have access to traceId via AsyncLocalStorage
  withTraceId(traceId, () => {
    next();
  });
};

/**
 * Alternative: Express async middleware wrapper for cleaner error handling
 * Use this if you need better error propagation
 */
const asyncRequestLoggerMiddleware = (req, res, next) => {
  const traceId =
    req.headers["x-correlation-id"] || `${Date.now()}-${uuidv4()}`;
  req.traceId = traceId;
  req.correlationId = traceId;
  res.setHeader("X-Correlation-ID", traceId);

  const requestStart = Date.now();
  const originalEnd = res.end;

  res.end = function (...args) {
    const responseTime = Date.now() - requestStart;
    originalEnd.apply(res, args);

    withTraceId(traceId, () => {
      const logData = {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        correlationId: traceId,
      };

      if (res.statusCode >= 500) {
        logger.error("HTTP Request Error", logData);
      } else if (res.statusCode >= 400) {
        logger.warn("HTTP Request Warning", logData);
      } else {
        logger.info("HTTP Request Success", logData);
      }
    });
  };

  withTraceId(traceId, () => next());
};

/**
 * Manual Correlation ID setter (for testing or manual control)
 *
 * Usage:
 *   app.use(setCorrelationId);
 */
const setCorrelationId = (req, res, next) => {
  const traceId =
    req.headers["x-correlation-id"] || `${Date.now()}-${uuidv4()}`;
  req.traceId = traceId;
  res.setHeader("X-Correlation-ID", traceId);
  next();
};

module.exports = {
  requestLoggerMiddleware,
  asyncRequestLoggerMiddleware,
  setCorrelationId,
};

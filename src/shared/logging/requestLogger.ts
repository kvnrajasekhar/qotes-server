import { v4 as uuidv4 } from "uuid";
import { createLogger, withTraceId } from "./logger";
import { Request, Response, NextFunction } from "express";

const logger = createLogger("request-logger");

/**
 * Request Logger Middleware
 *
 * Usage in Express:
 *   const { requestLoggerMiddleware } = require('./src/shared/logging/requestLogger');
 *   app.use(requestLoggerMiddleware);
 */
const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // ============== STEP 1: EXTRACT OR GENERATE CORRELATION ID ==============
  // Check if correlation ID exists in header (from upstream service/client)
  const headerId = Array.isArray(req.headers["x-correlation-id"])
    ? req.headers["x-correlation-id"][0]
    : (req.headers["x-correlation-id"] as string | undefined);
  const headerTrace = Array.isArray(req.headers["x-trace-id"])
    ? req.headers["x-trace-id"][0]
    : (req.headers["x-trace-id"] as string | undefined);

  let traceId: string = headerId || headerTrace || `${Date.now()}-${uuidv4()}`;

  // Attach to request object for access in route handlers
  (req as any).traceId = traceId;
  (req as any).correlationId = traceId; // Alternative naming convention

  // Add to response headers (for client/upstream services to track)
  res.setHeader("X-Correlation-ID", traceId);
  res.setHeader("X-Trace-ID", traceId);

  // ============== STEP 2: RECORD REQUEST TIMING ==============
  const requestStart = Date.now();

  // ============== STEP 3: INTERCEPT RESPONSE ==============
  // Capture the original res.end to log after response is sent
  const originalEnd = res.end.bind(res);
  (res as any).end = function (...args: any[]) {
    const responseTime = Date.now() - requestStart;

    // Call original end and capture return value
    const ret = originalEnd(...args as any);

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

    return ret as any;
  };

  // ============== STEP 5: WRAP next() IN TRACE CONTEXT ==============
  // Ensures all async handlers have access to traceId via AsyncLocalStorage
  withTraceId(traceId, () => next());
};

/**
 * Alternative: Express async middleware wrapper for cleaner error handling
 * Use this if you need better error propagation
 */
const asyncRequestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const headerId = Array.isArray(req.headers["x-correlation-id"])
    ? req.headers["x-correlation-id"][0]
    : (req.headers["x-correlation-id"] as string | undefined);
  const traceId = headerId || `${Date.now()}-${uuidv4()}`;
  (req as any).traceId = traceId;
  (req as any).correlationId = traceId;
  res.setHeader("X-Correlation-ID", traceId);

  const requestStart = Date.now();
  const originalEnd = res.end.bind(res);

  (res as any).end = function (...args: any[]) {
    const responseTime = Date.now() - requestStart;
    const ret = originalEnd(...args as any);

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

    return ret as any;
  };

  withTraceId(traceId, () => next());
};

/**
 * Manual Correlation ID setter (for testing or manual control)
 *
 * Usage:
 *   app.use(setCorrelationId);
 */
const setCorrelationId = (req: Request, res: Response, next: NextFunction) => {
  const traceId = req.headers["x-correlation-id"] || `${Date.now()}-${uuidv4()}`;
  // attach to request as any extension for middleware compatibility
  (req as any).traceId = traceId;
  res.setHeader("X-Correlation-ID", traceId);
  next();
};

export { requestLoggerMiddleware, asyncRequestLoggerMiddleware, setCorrelationId };

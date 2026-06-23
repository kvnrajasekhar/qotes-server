// Replace line 1 & 2 with the new logger factory:
const { createLogger, withTraceId } = require("../logging/logger"); // Adjust this path if your folder layout differs
const { errorResponse } = require("../utils/responseFormatter.util");

// Initialize a specific logger context for HTTP requests
const logger = createLogger("request-logger");

const requestLogger = (req, res, next) => {
  const startAt = process.hrtime.bigint();
  const userId = req.user?.id || req.user?._id || "anonymous";

  // Generate or extract a traceId (so your app is microservices-ready)
  const traceId =
    req.headers["x-correlation-id"] ||
    req.headers["x-trace-id"] ||
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.traceId = traceId;
  res.setHeader("X-Correlation-ID", traceId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1e6;

    // Wrap the log inside withTraceId context so the log formatting safely reads it
    withTraceId(traceId, () => {
      logger.info("HTTP request completed", {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        userId,
        route: req.route?.path || req.originalUrl,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        referer: req.headers.referer || req.headers.referrer,
      });
    });
  });

  res.on("close", () => {
    if (!res.writableEnded) {
      withTraceId(traceId, () => {
        logger.warn("HTTP request closed before response finished", {
          method: req.method,
          url: req.originalUrl,
          userId,
          ip: req.ip,
        });
      });
    }
  });

  // Run the rest of the express pipeline inside the async trace store
  withTraceId(traceId, () => {
    next();
  });
};

const notFoundHandler = (req, res) => {
  return errorResponse(res, 404, "Route not found");
};

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const userId = req.user?.id || req.user?._id || "anonymous";

  // Fallback trace context inside error boundary
  const traceId = req.traceId || "no-trace";
  withTraceId(traceId, () => {
    logger.error("Unhandled request error", {
      status,
      method: req.method,
      path: req.originalUrl,
      userId,
      error: err,
    });
  });

  const errors =
    process.env.NODE_ENV === "production"
      ? []
      : [{ message: err.message, stack: err.stack }];

  return errorResponse(
    res,
    status,
    err.message || "Internal server error",
    errors,
  );
};

module.exports = {
  requestLogger,
  notFoundHandler,
  errorHandler,
};

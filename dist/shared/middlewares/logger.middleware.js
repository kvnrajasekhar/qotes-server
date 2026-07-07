"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = exports.requestLogger = void 0;
const logger_1 = require("../logging/logger");
const responseFormatter_util_1 = require("../utils/responseFormatter.util");
const logger = (0, logger_1.createLogger)("request-logger");
const requestLogger = (req, res, next) => {
  const startAt = process.hrtime.bigint();
  const userId = req.user?.id || req.user?._id || "anonymous";
  const traceId =
    req.headers["x-correlation-id"] ||
    req.headers["x-trace-id"] ||
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.traceId = traceId;
  res.setHeader("X-Correlation-ID", traceId);
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1e6;
    (0, logger_1.withTraceId)(traceId, () => {
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
      (0, logger_1.withTraceId)(traceId, () => {
        logger.warn("HTTP request closed before response finished", {
          method: req.method,
          url: req.originalUrl,
          userId,
          ip: req.ip,
        });
      });
    }
  });
  (0, logger_1.withTraceId)(traceId, () => {
    next();
  });
};
exports.requestLogger = requestLogger;
const notFoundHandler = (req, res) => {
  return (0, responseFormatter_util_1.errorResponse)(
    res,
    404,
    "Route not found",
  );
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const userId = req.user?.id || req.user?._id || "anonymous";
  const traceId = req.traceId || "no-trace";
  (0, logger_1.withTraceId)(traceId, () => {
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
  return (0, responseFormatter_util_1.errorResponse)(
    res,
    status,
    err.message || "Internal server error",
    errors,
  );
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=logger.middleware.js.map

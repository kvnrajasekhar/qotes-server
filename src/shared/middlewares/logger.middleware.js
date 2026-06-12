const logger = require("../utils/logger.util");
const { errorResponse } = require("../utils/responseFormatter.util");

const requestLogger = (req, res, next) => {
  const startAt = process.hrtime.bigint();
  const userId = req.user?.id || req.user?._id || "anonymous";

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1e6;
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

  res.on("close", () => {
    if (!res.writableEnded) {
      logger.warn("HTTP request closed before response finished", {
        method: req.method,
        url: req.originalUrl,
        userId,
        ip: req.ip,
      });
    }
  });

  next();
};

const notFoundHandler = (req, res) => {
  return errorResponse(res, 404, "Route not found");
};

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const userId = req.user?.id || req.user?._id || "anonymous";

  logger.error("Unhandled request error", {
    status,
    method: req.method,
    path: req.originalUrl,
    userId,
    error: err,
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

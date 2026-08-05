import { createLogger, withTraceId } from "../logging/logger";
import { errorResponse } from "../utils/responseFormatter.util";
import { Request, Response, NextFunction } from "express";

const logger = createLogger("request-logger");

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      user?: any;
    }
  }
}

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startAt = process.hrtime.bigint();
  const userId = req.user?.id || req.user?._id || "anonymous";

  const traceId =
    (req.headers["x-correlation-id"] as string) ||
    (req.headers["x-trace-id"] as string) ||
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.traceId = traceId;
  res.setHeader("X-Correlation-ID", traceId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1e6;

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

  withTraceId(traceId, () => {
    next();
  });
};

const notFoundHandler = (req: Request, res: Response) => {
  return errorResponse(res, 404, "Route not found");
};

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const status = err.status || 500;
  const userId = req.user?.id || req.user?._id || "anonymous";

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

export { requestLogger, notFoundHandler, errorHandler };

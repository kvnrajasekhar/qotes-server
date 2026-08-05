import express, { Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";

import {
  successResponse,
  errorResponse,
} from "./shared/utils/responseFormatter.util";
import { redis } from "./shared/utils/redis.utils";
import {
  observeRequest,
  getMetricsSnapshot,
  toPrometheus,
} from "./shared/observability/metrics";
import {
  requestLogger,
  notFoundHandler,
  errorHandler,
} from "./shared/middlewares/logger.middleware";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  }),
);
app.use(express.json());
app.use(requestLogger);
app.use(observeRequest);

app.get("/", (req: Request, res: Response) => {
  return successResponse(res, 200, "API is running");
});

app.get("/health", (req: Request, res: Response) => {
  return successResponse(res, 200, "Service is healthy", {
    service: "qotes-api",
    uptime: process.uptime(),
  });
});

app.get("/ready", (req: Request, res: Response) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redisReady = redis.status === "ready";
  const kafkaReady = req.app.locals.kafkaReady === true;

  const readiness = {
    ready: mongoReady,
    service: "qotes-api",
    dependencies: {
      mongodb: {
        required: true,
        ready: mongoReady,
        state: mongoose.connection.readyState,
      },
      redis: {
        required: false,
        ready: redisReady,
        state: redis.status,
      },
      kafka: {
        required: false,
        ready: kafkaReady,
        state: req.app.locals.kafkaStatus || "unknown",
      },
    },
  };

  if (!readiness.ready) {
    return errorResponse(res, 503, "Service is not ready", readiness);
  }

  return successResponse(res, 200, "Service is ready", readiness);
});

app.get("/metrics", (req: Request, res: Response) => {
  const snapshot = getMetricsSnapshot();
  res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  return res.status(200).send(toPrometheus(snapshot));
});

// All API routes are now handled by NestJS controllers
// Express routes removed after migration to NestJS

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

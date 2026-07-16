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

// Express routes - will be replaced by NestJS controllers
import adminRouter from "./modules/admin/admin.route";
import collectionRouter from "./modules/collections/collections.route";
import commentRouter from "./modules/comments/comment.route";
import feedRouter from "./modules/feeds/feed.route";
import notificationRouter from "./modules/notifications/notification.route";
import preferenceRouter from "./modules/preferences/preference.route";
import quoteRouter from "./modules/quotes/quote.route";
import reactionRouter from "./modules/reactions/reaction.route";
import safetyRouter from "./modules/safety/safety.route";
import searchRouter from "./modules/search/search.route";
import userRouter from "./modules/users/user.route";
import systemRouter from "./modules/system/system.route";

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

app.use("/v1/admin", adminRouter);
// app.use("/v1/auth", authRouter); // Migrated to NestJS
app.use("/v1/collections", collectionRouter);
app.use("/v1/comment", commentRouter);
app.use("/v1/feed", feedRouter);
app.use("/v1/notifications", notificationRouter);
app.use("/v1/preference", preferenceRouter);
app.use("/v1/quote", quoteRouter);
app.use("/v1/reaction", reactionRouter);
app.use("/v1/safety", safetyRouter);
app.use("/v1/search", searchRouter);
app.use("/v1/user", userRouter);
app.use("/v1/system", systemRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

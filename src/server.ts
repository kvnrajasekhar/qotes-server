import dotenv from "dotenv";

import logger from "./shared/utils/logger.util";
import app from "./app";
import { connectToDatabase } from "./config/database";
import { connectKafka } from "./infrastructure/kafka/config/kafka.config";
import initTopics from "./infrastructure/kafka/initTopics";
import { initializeSocket } from "./modules/notifications/notification.socket";

dotenv.config();

const port = process.env.PORT || 3030;

declare module "express" {
  interface Application {
    locals: {
      kafkaReady?: boolean;
      kafkaStatus?: string;
    };
  }
}

process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Unhandled promise rejection", { reason });
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught exception", { error });
  process.exit(1);
});

const startOptionalMessaging = async (): Promise<void> => {
  try {
    logger.info("Starting optional Kafka messaging", { service: "kafka" });
    await connectKafka();
    await initTopics();
    app.locals.kafkaReady = true;
    app.locals.kafkaStatus = "ready";
    logger.info("Kafka messaging is ready", { service: "kafka" });
  } catch (err) {
    app.locals.kafkaReady = false;
    app.locals.kafkaStatus = "unavailable";
    logger.error(
      "Kafka is unavailable; API will continue without async messaging",
      {
        service: "kafka",
        error: err,
      },
    );
  }
};

const startServer = async (): Promise<void> => {
  await connectToDatabase();

  const server = app.listen(port, () => {
    logger.info("HTTP server started", {
      port,
      env: process.env.NODE_ENV || "development",
    });
  });

  // Initialize Socket.IO
  initializeSocket(server);

  await startOptionalMessaging();
};

startServer().catch((err: Error) => {
  logger.error("Failed to start API server", { error: err });
  process.exit(1);
});

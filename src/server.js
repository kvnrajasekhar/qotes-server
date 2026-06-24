require("dotenv").config();

const logger = require("./shared/utils/logger.util");
const app = require("./app");
const { connectToDatabase } = require("./config/database");
const { connectKafka } = require("./infrastructure/kafka/config/kafka.config");
const initTopics = require("./infrastructure/kafka/initTopics");
const {
  initializeSocket,
} = require("./modules/notifications/notification.socket");

const port = process.env.PORT || 3030;

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error });
  process.exit(1);
});

const startOptionalMessaging = async () => {
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

const startServer = async () => {
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

startServer().catch((err) => {
  logger.error("Failed to start API server", { error: err });
  process.exit(1);
});

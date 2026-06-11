require("dotenv").config();

const logger = require("./shared/utils/logger.util");
const app = require("./app");
const { connectToDatabase } = require("./config/database");
const { connectKafka } = require("./infrastructure/kafka/config/kafka.config");
const initTopics = require("./infrastructure/kafka/initTopics");

const port = process.env.PORT || 3030;

const startOptionalMessaging = async () => {
  try {
    await connectKafka();
    await initTopics();
    app.locals.kafkaReady = true;
    app.locals.kafkaStatus = "ready";
    logger.info("Kafka messaging is ready");
  } catch (err) {
    app.locals.kafkaReady = false;
    app.locals.kafkaStatus = "unavailable";
    logger.error(
      "Kafka is unavailable; API will continue without async messaging: %s",
      err.message,
    );
  }
};

const startServer = async () => {
  await connectToDatabase();

  app.listen(port, () => {
    logger.info(`Server running on ${port}`);
  });

  startOptionalMessaging();
};

startServer().catch((err) => {
  logger.error("Failed to start API server: %o", err);
  process.exit(1);
});

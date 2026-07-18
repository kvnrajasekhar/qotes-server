"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const logger_util_1 = __importDefault(require("./shared/utils/logger.util"));
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const kafka_config_1 = require("./infrastructure/kafka/config/kafka.config");
const initTopics_1 = __importDefault(require("./infrastructure/kafka/initTopics"));
const notification_socket_1 = require("./modules/notifications/notification.socket");
dotenv_1.default.config();
const port = process.env.PORT || 3030;
process.on("unhandledRejection", (reason) => {
    logger_util_1.default.error("Unhandled promise rejection", { reason });
});
process.on("uncaughtException", (error) => {
    logger_util_1.default.error("Uncaught exception", { error });
    process.exit(1);
});
const startOptionalMessaging = async () => {
    try {
        logger_util_1.default.info("Starting optional Kafka messaging", { service: "kafka" });
        await (0, kafka_config_1.connectKafka)();
        await (0, initTopics_1.default)();
        app_1.default.locals.kafkaReady = true;
        app_1.default.locals.kafkaStatus = "ready";
        logger_util_1.default.info("Kafka messaging is ready", { service: "kafka" });
    }
    catch (err) {
        app_1.default.locals.kafkaReady = false;
        app_1.default.locals.kafkaStatus = "unavailable";
        logger_util_1.default.error("Kafka is unavailable; API will continue without async messaging", {
            service: "kafka",
            error: err,
        });
    }
};
const startServer = async () => {
    await (0, database_1.connectToDatabase)();
    const server = app_1.default.listen(port, () => {
        logger_util_1.default.info("HTTP server started", {
            port,
            env: process.env.NODE_ENV || "development",
        });
    });
    (0, notification_socket_1.initializeSocket)(server);
    await startOptionalMessaging();
};
startServer().catch((err) => {
    logger_util_1.default.error("Failed to start API server", { error: err });
    process.exit(1);
});
//# sourceMappingURL=server.js.map
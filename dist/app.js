"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const responseFormatter_util_1 = require("./shared/utils/responseFormatter.util");
const redis_utils_1 = require("./shared/utils/redis.utils");
const metrics_1 = require("./shared/observability/metrics");
const logger_middleware_1 = require("./shared/middlewares/logger.middleware");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
}));
app.use(express_1.default.json());
app.use(logger_middleware_1.requestLogger);
app.use(metrics_1.observeRequest);
app.get("/", (req, res) => {
    return (0, responseFormatter_util_1.successResponse)(res, 200, "API is running");
});
app.get("/health", (req, res) => {
    return (0, responseFormatter_util_1.successResponse)(res, 200, "Service is healthy", {
        service: "qotes-api",
        uptime: process.uptime(),
    });
});
app.get("/ready", (req, res) => {
    const mongoReady = mongoose_1.default.connection.readyState === 1;
    const redisReady = redis_utils_1.redis.status === "ready";
    const kafkaReady = req.app.locals.kafkaReady === true;
    const readiness = {
        ready: mongoReady,
        service: "qotes-api",
        dependencies: {
            mongodb: {
                required: true,
                ready: mongoReady,
                state: mongoose_1.default.connection.readyState,
            },
            redis: {
                required: false,
                ready: redisReady,
                state: redis_utils_1.redis.status,
            },
            kafka: {
                required: false,
                ready: kafkaReady,
                state: req.app.locals.kafkaStatus || "unknown",
            },
        },
    };
    if (!readiness.ready) {
        return (0, responseFormatter_util_1.errorResponse)(res, 503, "Service is not ready", readiness);
    }
    return (0, responseFormatter_util_1.successResponse)(res, 200, "Service is ready", readiness);
});
app.get("/metrics", (req, res) => {
    const snapshot = (0, metrics_1.getMetricsSnapshot)();
    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    return res.status(200).send((0, metrics_1.toPrometheus)(snapshot));
});
app.use(logger_middleware_1.notFoundHandler);
app.use(logger_middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map
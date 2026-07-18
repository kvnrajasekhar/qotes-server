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
const admin_route_1 = __importDefault(require("./modules/admin/admin.route"));
const collections_route_1 = __importDefault(require("./modules/collections/collections.route"));
const comment_route_1 = __importDefault(require("./modules/comments/comment.route"));
const feed_route_1 = __importDefault(require("./modules/feeds/feed.route"));
const notification_route_1 = __importDefault(require("./modules/notifications/notification.route"));
const preference_route_1 = __importDefault(require("./modules/preferences/preference.route"));
const quote_route_1 = __importDefault(require("./modules/quotes/quote.route"));
const reaction_route_1 = __importDefault(require("./modules/reactions/reaction.route"));
const safety_route_1 = __importDefault(require("./modules/safety/safety.route"));
const search_route_1 = __importDefault(require("./modules/search/search.route"));
const user_route_1 = __importDefault(require("./modules/users/user.route"));
const system_route_1 = __importDefault(require("./modules/system/system.route"));
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
app.use("/v1/admin", admin_route_1.default);
app.use("/v1/collections", collections_route_1.default);
app.use("/v1/comment", comment_route_1.default);
app.use("/v1/feed", feed_route_1.default);
app.use("/v1/notifications", notification_route_1.default);
app.use("/v1/preference", preference_route_1.default);
app.use("/v1/quote", quote_route_1.default);
app.use("/v1/reaction", reaction_route_1.default);
app.use("/v1/safety", safety_route_1.default);
app.use("/v1/search", search_route_1.default);
app.use("/v1/user", user_route_1.default);
app.use("/v1/system", system_route_1.default);
app.use(logger_middleware_1.notFoundHandler);
app.use(logger_middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map
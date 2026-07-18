"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const auth_middleware_1 = __importDefault(require("../../shared/middlewares/auth.middleware"));
const feed_service_1 = __importDefault(require("./feed.service"));
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
const router = express_1.default.Router();
router.get("/", auth_middleware_1.default, (0, express_async_handler_1.default)(async (req, res) => {
    let { cursor, limit } = req.query;
    cursor = parseInt(cursor) || 1;
    limit = parseInt(limit) || 10;
    const result = await feed_service_1.default.getGlobalFeed(cursor, limit);
    return (0, responseFormatter_util_1.successResponse)(res, 200, "Quotes retrieved successfully", result);
}));
router.get("/following", auth_middleware_1.default, (0, express_async_handler_1.default)(async (req, res) => {
    const { cursor, limit = 10 } = req.query;
    const result = await feed_service_1.default.getFollowingFeed({
        userId: req.user._id,
        cursor,
        limit: parseInt(limit),
    });
    return (0, responseFormatter_util_1.successResponse)(res, 200, "Feed loaded", result);
}));
router.get("/discover", auth_middleware_1.default, (0, express_async_handler_1.default)(async (req, res) => {
    const { cursor, limit = 10 } = req.query;
    const result = await feed_service_1.default.getDiscoverFeed({
        userId: req.user._id,
        cursor,
        limit: parseInt(limit),
    });
    return (0, responseFormatter_util_1.successResponse)(res, 200, "Discover feed loaded", result);
}));
router.get("/q/:targetuserId", auth_middleware_1.default, (0, express_async_handler_1.default)(async (req, res) => {
    const { targetuserId } = req.params;
    let { cursor, limit } = req.query;
    cursor = parseInt(cursor) || 1;
    limit = parseInt(limit) || 10;
    const result = await feed_service_1.default.getUserQuotes({
        targetUserId: targetuserId,
        viewerId: req.user._id,
        cursor,
        limit,
    });
    return (0, responseFormatter_util_1.successResponse)(res, 200, "User quotes retrieved successfully", result);
}));
exports.default = router;
//# sourceMappingURL=feed.route.js.map
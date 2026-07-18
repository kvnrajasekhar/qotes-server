"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const auth_middleware_1 = __importDefault(require("../../shared/middlewares/auth.middleware"));
const rateLimiter_middleware_1 = require("../../shared/middlewares/rateLimiter.middleware");
const safety_service_1 = __importDefault(require("./safety.service"));
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
const router = express_1.default.Router();
const blockLimiter = (0, rateLimiter_middleware_1.createRateLimiter)({
    actionName: "toggle_block",
    burstWindowMs: 60 * 1000,
    burstLimit: 10,
    sustainedWindowMs: 3600 * 1000,
    sustainedLimit: 50,
    identifier: "userId",
});
const reportLimiter = (0, rateLimiter_middleware_1.createRateLimiter)({
    actionName: "report_content",
    burstWindowMs: 60 * 1000,
    burstLimit: 5,
    sustainedWindowMs: 3600 * 1000,
    sustainedLimit: 20,
    identifier: "userId",
});
router.post("/toggle-block", auth_middleware_1.default, blockLimiter, (0, express_async_handler_1.default)(async (req, res) => {
    const { blockedId } = req.body;
    const blockerId = req.user.id;
    const result = await safety_service_1.default.toggleBlockUser(blockerId, blockedId);
    if (!result) {
        return (0, responseFormatter_util_1.errorResponse)(res, 400, "Unable to block/unblock user", null);
    }
    return (0, responseFormatter_util_1.successResponse)(res, 200, "User blocked/unblocked successfully", result);
}));
router.post("/report", auth_middleware_1.default, reportLimiter, (0, express_async_handler_1.default)(async (req, res) => {
    const reporterId = req.user.id;
    const { targetId, targetType, reason } = req.body;
    const result = await safety_service_1.default.report(reporterId, targetType, targetId, reason);
    if (!result) {
        return (0, responseFormatter_util_1.errorResponse)(res, 400, "Unable to report user", null);
    }
    return (0, responseFormatter_util_1.successResponse)(res, 200, "User reported successfully", result);
}));
exports.default = router;
//# sourceMappingURL=safety.route.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const auth_middleware_1 = __importDefault(require("../../shared/middlewares/auth.middleware"));
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
const preference_service_1 = __importDefault(require("./preference.service"));
const router = express_1.default.Router();
router.post("/not-interested", auth_middleware_1.default, (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { type, targetId, reason } = req.body;
        const userId = req.user.id;
        if (!["QUOTE", "AUTHOR", "TAG"].includes(type)) {
            return (0, responseFormatter_util_1.errorResponse)(res, 400, "Invalid type");
        }
        const preference = await preference_service_1.default.savePreference({
            userId,
            type,
            targetId,
            reason: reason || "NOT_INTERESTED",
        });
        return (0, responseFormatter_util_1.successResponse)(res, 201, `We'll show you less of this ${type.toLowerCase()}.`, preference);
    }
    catch (error) {
        return (0, responseFormatter_util_1.errorResponse)(res, 500, "Internal server error", error.message);
    }
}));
exports.default = router;
//# sourceMappingURL=preference.route.js.map
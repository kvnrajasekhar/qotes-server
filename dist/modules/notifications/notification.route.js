"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_async_handler_1 = __importDefault(
  require("express-async-handler"),
);
const auth_middleware_1 = __importDefault(
  require("../../shared/middlewares/auth.middleware"),
);
const notification_controller_1 = __importDefault(
  require("./notification.controller"),
);
const router = express_1.default.Router();
router.get(
  "/",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(
    notification_controller_1.default.getNotifications,
  ),
);
router.get(
  "/unread-count",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(
    notification_controller_1.default.getUnreadCount,
  ),
);
router.patch(
  "/:id/read",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(
    notification_controller_1.default.markAsRead,
  ),
);
router.patch(
  "/read-all",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(
    notification_controller_1.default.markAllAsRead,
  ),
);
router.delete(
  "/:id",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(
    notification_controller_1.default.deleteNotification,
  ),
);
exports.default = router;
//# sourceMappingURL=notification.route.js.map

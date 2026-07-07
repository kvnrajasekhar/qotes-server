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
const reaction_service_1 = __importDefault(require("./reaction.service"));
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
const router = express_1.default.Router();
router.post(
  "/:id",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const { type } = req.body;
    if (!type) {
      return (0, responseFormatter_util_1.errorResponse)(
        res,
        400,
        "Reaction type is required",
      );
    }
    const quoteId = req.params.id;
    const userId = req.user.userId;
    const result = await reaction_service_1.default.toggleReaction({
      userId,
      quoteId,
      type,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Quote reaction toggled successfully",
      result,
    );
  }),
);
router.get(
  "/:id",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const { id: quoteId } = req.params;
    const { type, cursor, limit = 20 } = req.query;
    const userId = req.user.id;
    const result = await reaction_service_1.default.getQuoteReactions({
      quoteId,
      viewerId: userId,
      type,
      cursor,
      limit: parseInt(limit),
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Quote reactions retrieved successfully",
      result,
    );
  }),
);
exports.default = router;
//# sourceMappingURL=reaction.route.js.map

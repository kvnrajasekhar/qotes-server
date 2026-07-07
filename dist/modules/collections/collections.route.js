"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const collections_service_1 = __importDefault(require("./collections.service"));
const express_async_handler_1 = __importDefault(
  require("express-async-handler"),
);
const auth_middleware_1 = __importDefault(
  require("../../shared/middlewares/auth.middleware"),
);
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
router.get(
  "/",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const { cursor, limit } = req.query;
    const data = await collections_service_1.default.getUserCollections({
      userId: req.user._id,
      cursor,
      limit: parseInt(limit) || 20,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Collections fetched successfully",
      data,
    );
  }),
);
router.get(
  "/:collectionId/items",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const { collectionId } = req.params;
    const { cursor, limit } = req.query;
    const data = await collections_service_1.default.getCollectionDetails({
      collectionId,
      cursor,
      limit: parseInt(limit) || 20,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Collection items retrieved",
      data,
    );
  }),
);
router.get(
  "/q/:quoteId",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const { quoteId } = req.params;
    const userId = req.user._id;
    const data = await collections_service_1.default.getQuoteDetails(
      quoteId,
      userId,
    );
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Quote details retrieved",
      data,
    );
  }),
);
router.post(
  "/:quoteId/toggle-save",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const { quoteId } = req.params;
    const userId = req.user._id;
    const { collectionId } = req.body;
    const data = await collections_service_1.default.toggleSave(
      userId,
      quoteId,
      collectionId,
    );
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Toggle save status",
      data,
    );
  }),
);
exports.default = router;
//# sourceMappingURL=collections.route.js.map

"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const express_async_handler_1 = __importDefault(
  require("express-async-handler"),
);
const auth_middleware_1 = __importDefault(
  require("../../shared/middlewares/auth.middleware"),
);
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
const comment_service_1 = __importDefault(require("./comment.service"));
router.post(
  "/:quoteId",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const { quoteId } = req.params;
    const { text, parentCommentId } = req.body;
    if (!text) {
      return (0, responseFormatter_util_1.errorResponse)(
        res,
        400,
        "Comment text is required",
      );
    }
    const comment = await comment_service_1.default.addComment({
      quoteId,
      userId,
      text,
      parentCommentId,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      201,
      "Comment added successfully",
      comment,
    );
  }),
);
router.patch(
  "/:commentId",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const { commentId } = req.params;
    const { text } = req.body;
    if (!text) {
      return (0, responseFormatter_util_1.errorResponse)(
        res,
        400,
        "Comment text is required",
      );
    }
    const updatedComment = await comment_service_1.default.editComment({
      commentId,
      userId,
      text,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Comment updated successfully",
      updatedComment,
    );
  }),
);
router.delete(
  "/:commentId",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const { commentId } = req.params;
    const deletedComment = await comment_service_1.default.deleteComment({
      commentId,
      userId,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Comment deleted successfully",
      deletedComment,
    );
  }),
);
router.get(
  "/:quoteId",
  (0, express_async_handler_1.default)(async (req, res) => {
    const { quoteId } = req.params;
    const { parentCommentId, cursor, limit } = req.query;
    const data = await comment_service_1.default.getComments({
      quoteId,
      parentCommentId,
      cursor,
      limit: parseInt(limit) || 20,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Comments retrieved successfully",
      data,
    );
  }),
);
router.post(
  "/:commentId/like",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const { commentId } = req.params;
    const result = await comment_service_1.default.toggleLike({
      commentId,
      userId,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Comment like toggled",
      result,
    );
  }),
);
exports.default = router;
//# sourceMappingURL=comment.route.js.map

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
const user_service_1 = __importDefault(require("./user.service"));
const upload_middleware_1 = __importDefault(
  require("../../shared/middlewares/upload.middleware"),
);
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
const user_model_1 = __importDefault(require("../../models/user.model"));
const router = express_1.default.Router();
router.get(
  "/suggested",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    const userId = req.user ? req.user.id : null;
    const suggestedUsers = await user_service_1.default.getSuggestedUsers({
      userId,
      limit,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Suggested users retrieved successfully",
      suggestedUsers,
    );
  }),
);
router.get(
  "/suggested/public",
  (0, express_async_handler_1.default)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    const suggestedUsers = await user_service_1.default.getSuggestedUsers({
      userId: null,
      limit,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Public suggested users retrieved successfully",
      suggestedUsers,
    );
  }),
);
router.get(
  "/u/:username",
  (0, express_async_handler_1.default)(async (req, res) => {
    const username = req.params.username;
    const user = await user_service_1.default.getUserByUsername(
      username,
      req.user ? req.user.id : null,
    );
    if (!user) {
      return (0, responseFormatter_util_1.errorResponse)(
        res,
        404,
        "User not found",
      );
    }
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "User retrieved successfully",
      user,
    );
  }),
);
router.get(
  "/profile/me",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const user = await user_model_1.default
      .findById(userId)
      .select("-password");
    if (!user) {
      return (0, responseFormatter_util_1.errorResponse)(
        res,
        404,
        "User not found",
      );
    }
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "User profile retrieved successfully",
      user,
    );
  }),
);
router.patch(
  "/profile/me",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const { firstName, lastName, email } = req.body;
    try {
      const updateUserProfile = user_service_1.default.updateUserProfile(
        userId,
        { firstName, lastName, email },
      );
      if (!updateUserProfile) {
        return (0, responseFormatter_util_1.errorResponse)(
          res,
          404,
          "User not found",
        );
      }
      return (0, responseFormatter_util_1.successResponse)(
        res,
        200,
        "User profile updated successfully",
        updateUserProfile,
      );
    } catch (err) {
      return (0, responseFormatter_util_1.errorResponse)(res, 400, err.message);
    }
  }),
);
router.put(
  "/avatar",
  auth_middleware_1.default,
  upload_middleware_1.default.single("avatar"),
  (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const avatarFile = req.file;
    if (!avatarFile) {
      return (0, responseFormatter_util_1.errorResponse)(
        res,
        400,
        "No image file uploaded.",
      );
    }
    try {
      const updatedUser = await user_service_1.default.updateUserAvatar(
        userId,
        avatarFile,
      );
      return (0, responseFormatter_util_1.successResponse)(
        res,
        200,
        "Avatar updated successfully.",
        {
          avatarUrl: updatedUser.avatar,
        },
      );
    } catch (error) {
      console.error("Avatar update failed:", error.message);
      if (error.message.includes("User not found")) {
        return (0, responseFormatter_util_1.errorResponse)(
          res,
          404,
          error.message,
        );
      }
      return (0, responseFormatter_util_1.errorResponse)(
        res,
        500,
        error.message || "Failed to update avatar.",
      );
    }
  }),
);
router.post(
  "/follow/:id",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const followerId = req.user.userId;
    const targetId = req.params.id;
    const result = await user_service_1.default.toggleFollow(
      followerId,
      targetId,
    );
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      result.message,
      { followed: result.followed },
    );
  }),
);
router.get(
  "/:userId/requotes",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.params;
    const { cursor, limit } = req.query;
    const targetUserId = userId === "me" ? req.user.id : userId;
    const data = await user_service_1.default.getRequotes({
      userId: targetUserId,
      cursor,
      limit: parseInt(limit) || 20,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Requotes fetched",
      data,
    );
  }),
);
router.get(
  "/me/following",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const currentUserId = req.user.id;
    const { cursor, limit } = req.query;
    const data = await user_service_1.default.getFollowing({
      userId,
      currentUserId,
      cursor,
      limit: parseInt(limit) || 20,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Following fetched",
      data,
    );
  }),
);
router.get(
  "/me/followers",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.id;
    const currentUserId = req.user.id;
    const { cursor, limit } = req.query;
    const data = await user_service_1.default.getFollowers({
      userId,
      currentUserId,
      cursor,
      limit: parseInt(limit) || 20,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Followers fetched",
      data,
    );
  }),
);
router.get(
  "/:userId/followers",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.params;
    const { cursor, limit } = req.query;
    const currentUserId = req.user.id;
    const data = await user_service_1.default.getFollowers({
      userId,
      currentUserId,
      cursor,
      limit: parseInt(limit) || 20,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Followers fetched",
      data,
    );
  }),
);
router.get(
  "/:userId/following",
  auth_middleware_1.default,
  (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.params;
    const { cursor, limit } = req.query;
    const currentUserId = req.user.id;
    const data = await user_service_1.default.getFollowing({
      userId,
      currentUserId,
      cursor,
      limit: parseInt(limit) || 20,
    });
    return (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Following fetched",
      data,
    );
  }),
);
exports.default = router;
//# sourceMappingURL=user.route.js.map

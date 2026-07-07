"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const express_async_handler_1 = __importDefault(
  require("express-async-handler"),
);
const fs_1 = require("fs");
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
const auth_middleware_1 = __importDefault(
  require("../../shared/middlewares/auth.middleware"),
);
const upload_middleware_1 = __importDefault(
  require("../../shared/middlewares/upload.middleware"),
);
const rateLimiter_middleware_1 = require("../../shared/middlewares/rateLimiter.middleware");
const auth_service_1 = __importDefault(require("./auth.service"));
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const loginLimiter = (0, rateLimiter_middleware_1.createRateLimiter)({
  actionName: "login",
  burstWindowMs: 60 * 1000,
  burstLimit: 5,
  sustainedWindowMs: 3600 * 1000,
  sustainedLimit: 20,
  identifier: "ip",
});
const signupLimiter = (0, rateLimiter_middleware_1.createRateLimiter)({
  actionName: "signup",
  burstWindowMs: 60 * 1000,
  burstLimit: 3,
  sustainedWindowMs: 3600 * 1000,
  sustainedLimit: 10,
  identifier: "ip",
});
const passwordResetLimiter = (0, rateLimiter_middleware_1.createRateLimiter)({
  actionName: "password_reset",
  burstWindowMs: 60 * 1000,
  burstLimit: 3,
  sustainedWindowMs: 3600 * 1000,
  sustainedLimit: 5,
  identifier: "ip",
});
const tokenRefreshLimiter = (0, rateLimiter_middleware_1.createRateLimiter)({
  actionName: "token_refresh",
  burstWindowMs: 60 * 1000,
  burstLimit: 10,
  sustainedWindowMs: 3600 * 1000,
  sustainedLimit: 50,
  identifier: "ip",
});
const updatePasswordLimiter = (0, rateLimiter_middleware_1.createRateLimiter)({
  actionName: "update_password",
  burstWindowMs: 60 * 1000,
  burstLimit: 3,
  sustainedWindowMs: 3600 * 1000,
  sustainedLimit: 10,
  identifier: "userId",
});
router.post(
  "/login",
  loginLimiter,
  (0, express_async_handler_1.default)(async (req, res) => {
    const { identifier, password } = req.body;
    const result = await auth_service_1.default.login(identifier, password);
    if (!result) {
      (0, responseFormatter_util_1.errorResponse)(
        res,
        401,
        "Invalid credentials",
      );
      return;
    }
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Login successful",
      {
        accessToken: result.accessToken,
        userId: result.userId,
      },
    );
  }),
);
router.post(
  "/signup",
  signupLimiter,
  upload_middleware_1.default.single("avatar"),
  (0, express_async_handler_1.default)(async (req, res) => {
    const { username, email, password, firstName, lastName, bio } = req.body;
    const avatarFile = req.file || null;
    const existingUser =
      await auth_service_1.default.findUserByUsernameOrEmail(username);
    if (existingUser) {
      if (avatarFile) await fs_1.promises.unlink(avatarFile.path);
      (0, responseFormatter_util_1.errorResponse)(
        res,
        409,
        "Username already exists",
      );
      return;
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    await auth_service_1.default.saveUser(
      username,
      email,
      hashedPassword,
      firstName,
      lastName,
      bio,
      avatarFile,
    );
    (0, responseFormatter_util_1.successResponse)(
      res,
      201,
      "User registered successfully",
    );
  }),
);
router.post(
  "/logout",
  (0, express_async_handler_1.default)(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await auth_service_1.default.deleteRefreshToken(refreshToken);
    }
    res.clearCookie("refreshToken");
    (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Logged out successfully",
    );
  }),
);
router.post(
  "/refresh",
  tokenRefreshLimiter,
  (0, express_async_handler_1.default)(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      (0, responseFormatter_util_1.errorResponse)(
        res,
        401,
        "Refresh token not found",
      );
      return;
    }
    const { accessToken } =
      await auth_service_1.default.refreshAccessToken(refreshToken);
    (0, responseFormatter_util_1.successResponse)(
      res,
      200,
      "Token refreshed successfully",
      {
        accessToken,
      },
    );
  }),
);
router.post(
  "/forgot-password",
  passwordResetLimiter,
  (0, express_async_handler_1.default)(async (req, res) => {
    const { email } = req.body;
    const result =
      await auth_service_1.default.generateResetTokenAndSendEmail(email);
    (0, responseFormatter_util_1.successResponse)(res, 200, result.message);
  }),
);
const postResetPassword = (0, express_async_handler_1.default)(
  async (req, res) => {
    const id = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;
    const { newPassword, cnfPassword } = req.body;
    try {
      const result = await auth_service_1.default.resetPasswordWithToken(
        id,
        token,
        newPassword,
        cnfPassword,
      );
      (0, responseFormatter_util_1.successResponse)(res, 200, result.message);
    } catch (err) {
      const message = err.message;
      if (message.includes("Invalid reset link")) {
        (0, responseFormatter_util_1.errorResponse)(res, 404, message);
        return;
      } else if (message.includes("expired") || message.includes("match")) {
        (0, responseFormatter_util_1.errorResponse)(res, 400, message);
        return;
      }
      console.error("Reset password failed:", err);
      (0, responseFormatter_util_1.errorResponse)(
        res,
        500,
        "Internal Server Error",
      );
    }
  },
);
router.post(
  "/forgotpassword/:userId/:token",
  passwordResetLimiter,
  postResetPassword,
);
router.post(
  "/update-password",
  auth_middleware_1.default,
  updatePasswordLimiter,
  (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const { oldPassword, newPassword, confirmPassword } = req.body;
    try {
      const result = await auth_service_1.default.updateUserPassword(
        userId,
        oldPassword,
        newPassword,
        confirmPassword,
      );
      res.clearCookie("refreshToken");
      (0, responseFormatter_util_1.successResponse)(res, 200, result.message);
    } catch (err) {
      const message = err.message;
      if (
        message.includes("not match") ||
        message.includes("Current password incorrect")
      ) {
        (0, responseFormatter_util_1.errorResponse)(res, 400, message);
        return;
      }
      console.error("Password update failed:", err);
      (0, responseFormatter_util_1.errorResponse)(
        res,
        500,
        "Internal Server Error",
      );
    }
  }),
);
exports.default = router;
//# sourceMappingURL=auth.route.js.map

import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { promises as fs } from "fs";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/responseFormatter.util";
import authMiddleware from "../../shared/middlewares/auth.middleware";
import upload from "../../shared/middlewares/upload.middleware";
import { createRateLimiter } from "../../shared/middlewares/rateLimiter.middleware";
import authService from "./auth.service";
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

const loginLimiter = createRateLimiter({
  actionName: "login",
  burstWindowMs: 60 * 1000,
  burstLimit: 5,
  sustainedWindowMs: 3600 * 1000,
  sustainedLimit: 20,
  identifier: "ip",
});

const signupLimiter = createRateLimiter({
  actionName: "signup",
  burstWindowMs: 60 * 1000,
  burstLimit: 3,
  sustainedWindowMs: 3600 * 1000,
  sustainedLimit: 10,
  identifier: "ip",
});

const passwordResetLimiter = createRateLimiter({
  actionName: "password_reset",
  burstWindowMs: 60 * 1000,
  burstLimit: 3,
  sustainedWindowMs: 3600 * 1000,
  sustainedLimit: 5,
  identifier: "ip",
});

const tokenRefreshLimiter = createRateLimiter({
  actionName: "token_refresh",
  burstWindowMs: 60 * 1000,
  burstLimit: 10,
  sustainedWindowMs: 3600 * 1000,
  sustainedLimit: 50,
  identifier: "ip",
});

const updatePasswordLimiter = createRateLimiter({
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
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { identifier, password } = req.body as {
      identifier?: string;
      password?: string;
    };

    const result = await authService.login(identifier, password);

    if (!result) {
      errorResponse(res, 401, "Invalid credentials");
      return;
    }

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    successResponse(res, 200, "Login successful", {
      accessToken: result.accessToken,
      userId: result.userId,
    });
  }),
);

router.post(
  "/signup",
  signupLimiter,
  upload.single("avatar"),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username, email, password, firstName, lastName, bio } =
      req.body as {
        username?: string;
        email?: string;
        password?: string;
        firstName?: string;
        lastName?: string;
        bio?: string;
      };
    const avatarFile = req.file || null;

    const existingUser = await authService.findUserByUsernameOrEmail(username);

    if (existingUser) {
      if (avatarFile) await fs.unlink(avatarFile.path);
      errorResponse(res, 409, "Username already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await authService.saveUser(
      username,
      email,
      hashedPassword,
      firstName,
      lastName,
      bio,
      avatarFile,
    );

    successResponse(res, 201, "User registered successfully");
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await authService.deleteRefreshToken(refreshToken);
    }

    res.clearCookie("refreshToken");
    successResponse(res, 200, "Logged out successfully");
  }),
);

router.post(
  "/refresh",
  tokenRefreshLimiter,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      errorResponse(res, 401, "Refresh token not found");
      return;
    }

    const { accessToken } = await authService.refreshAccessToken(refreshToken);

    successResponse(res, 200, "Token refreshed successfully", {
      accessToken,
    });
  }),
);

router.post(
  "/forgot-password",
  passwordResetLimiter,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as { email?: string };

    const result = await authService.generateResetTokenAndSendEmail(email);

    successResponse(res, 200, result.message);
  }),
);

const postResetPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    const token = Array.isArray(req.params.token)
      ? req.params.token[0]
      : req.params.token;
    const { newPassword, cnfPassword } = req.body as {
      newPassword?: string;
      cnfPassword?: string;
    };

    try {
      const result = await authService.resetPasswordWithToken(
        id,
        token,
        newPassword,
        cnfPassword,
      );

      successResponse(res, 200, result.message);
    } catch (err: any) {
      const message = err.message;

      if (message.includes("Invalid reset link")) {
        errorResponse(res, 404, message);
        return;
      } else if (message.includes("expired") || message.includes("match")) {
        errorResponse(res, 400, message);
        return;
      }

      console.error("Reset password failed:", err);
      errorResponse(res, 500, "Internal Server Error");
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
  authMiddleware,
  updatePasswordLimiter,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { oldPassword, newPassword, confirmPassword } = req.body as {
      oldPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    try {
      const result = await authService.updateUserPassword(
        userId,
        oldPassword,
        newPassword,
        confirmPassword,
      );

      res.clearCookie("refreshToken");

      successResponse(res, 200, result.message);
    } catch (err: any) {
      const message = err.message;

      if (
        message.includes("not match") ||
        message.includes("Current password incorrect")
      ) {
        errorResponse(res, 400, message);
        return;
      }

      console.error("Password update failed:", err);
      errorResponse(res, 500, "Internal Server Error");
    }
  }),
);

export default router;

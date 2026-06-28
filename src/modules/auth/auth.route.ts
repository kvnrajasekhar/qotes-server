import express from "express";
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
import { Request, Response } from "express";

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
  asyncHandler(async (req: Request, res: Response) => {
    const { identifier, password } = req.body;

    const result = await authService.login(identifier, password);

    if (!result) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(res, 200, "Login successful", {
      accessToken: result.accessToken,
      userId: result.userId,
    });
  }),
);

router.post(
  "/signup",
  signupLimiter,
  upload.single("avatar"),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password, firstName, lastName, bio } = req.body;
    const avatarFile = req.file || null;

    const existingUser = await authService.findUserByUsernameOrEmail(username);

    if (existingUser) {
      if (avatarFile) await fs.unlink(avatarFile.path);
      return errorResponse(res, 409, "Username already exists");
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

    return successResponse(res, 201, "User registered successfully");
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await authService.deleteRefreshToken(refreshToken);
    }

    res.clearCookie("refreshToken");
    return successResponse(res, 200, "Logged out successfully");
  }),
);

router.post(
  "/refresh",
  tokenRefreshLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return errorResponse(res, 401, "Refresh token not found");
    }

    const { accessToken } = await authService.refreshAccessToken(refreshToken);

    return successResponse(res, 200, "Token refreshed successfully", {
      accessToken,
    });
  }),
);

router.post(
  "/forgot-password",
  passwordResetLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const result = await authService.generateResetTokenAndSendEmail(email);

    return successResponse(res, 200, result.message);
  }),
);

const postResetPassword = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.userId;
  const token = req.params.token;
  const { newPassword, cnfPassword } = req.body;

  try {
    const result = await authService.resetPasswordWithToken(
      id,
      token,
      newPassword,
      cnfPassword,
    );

    return successResponse(res, 200, result.message);
  } catch (err: any) {
    const message = err.message;

    if (message.includes("Invalid reset link")) {
      return errorResponse(res, 404, message);
    } else if (message.includes("expired") || message.includes("match")) {
      return errorResponse(res, 400, message);
    }

    console.error("Reset password failed:", err);
    return errorResponse(res, 500, "Internal Server Error");
  }
});

router.post(
  "/forgotpassword/:userId/:token",
  passwordResetLimiter,
  postResetPassword,
);

router.post(
  "/update-password",
  authMiddleware,
  updatePasswordLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    try {
      const result = await authService.updateUserPassword(
        userId,
        oldPassword,
        newPassword,
        confirmPassword,
      );

      res.clearCookie("refreshToken");

      return successResponse(res, 200, result.message);
    } catch (err: any) {
      const message = err.message;

      if (
        message.includes("not match") ||
        message.includes("Current password incorrect")
      ) {
        return errorResponse(res, 400, message);
      }

      console.error("Password update failed:", err);
      return errorResponse(res, 500, "Internal Server Error");
    }
  }),
);

export default router;

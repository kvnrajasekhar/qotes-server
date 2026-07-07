// Block & Report User
// @ts-nocheck
import express from "express";
import asyncHandler from "express-async-handler";
import authMiddleware from "../../shared/middlewares/auth.middleware";
import { createRateLimiter } from "../../shared/middlewares/rateLimiter.middleware";
import safetyService from "./safety.service";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/responseFormatter.util";

const router = express.Router();

// ==========================================
// RATE LIMITERS CONFIGURATION
// ==========================================

// Blocking shouldn't happen rapidly, but allow enough for managing a list
const blockLimiter = createRateLimiter({
  actionName: "toggle_block",
  burstWindowMs: 60 * 1000, // 1 minute
  burstLimit: 10, // 10 blocks/unblocks per minute
  sustainedWindowMs: 3600 * 1000, // 1 hour
  sustainedLimit: 50, // Max 50 per hour
  identifier: "userId", // Track by the authenticated user
});

// Reporting is sensitive and should be strictly limited to prevent spamming admins
const reportLimiter = createRateLimiter({
  actionName: "report_content",
  burstWindowMs: 60 * 1000, // 1 minute
  burstLimit: 5, // 5 reports per minute
  sustainedWindowMs: 3600 * 1000, // 1 hour
  sustainedLimit: 20, // Max 20 reports per hour
  identifier: "userId", // Track by the authenticated user
});

// ==========================================
// ROUTES
// ==========================================

// Block a user
// NOTE: authMiddleware MUST come before blockLimiter so req.user is available
router.post(
  "/toggle-block",
  authMiddleware,
  blockLimiter,
  asyncHandler(async (req, res) => {
    const { blockedId } = req.body;
    const blockerId = req.user.id;

    const result = await safetyService.toggleBlockUser(blockerId, blockedId);

    if (!result) {
      return errorResponse(res, 400, "Unable to block/unblock user", null);
    }

    return successResponse(
      res,
      200,
      "User blocked/unblocked successfully",
      result,
    );
  }),
);

// Report user/content
router.post(
  "/report",
  authMiddleware,
  reportLimiter,
  asyncHandler(async (req, res) => {
    const reporterId = req.user.id;
    const { targetId, targetType, reason } = req.body;

    const result = await safetyService.report(
      reporterId,
      targetType,
      targetId,
      reason,
    );

    if (!result) {
      return errorResponse(res, 400, "Unable to report user", null);
    }

    return successResponse(res, 200, "User reported successfully", result);
  }),
);

export default router;

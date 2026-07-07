// Handling Not Interested (User Experience)
// @ts-nocheck
import express from "express";
import asyncHandler from "express-async-handler";
import authMiddleware from "../../shared/middlewares/auth.middleware";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/responseFormatter.util";
import preferenceService from "./preference.service";

const router = express.Router();

router.post(
  "/not-interested",
  authMiddleware,
  asyncHandler(async (req, res) => {
    try {
      const { type, targetId, reason } = req.body;
      const userId = req.user.id;

      // Validate type against your model's enum: ["QUOTE", "AUTHOR", "TAG"]
      if (!["QUOTE", "AUTHOR", "TAG"].includes(type)) {
        return errorResponse(res, 400, "Invalid type");
      }

      const preference = await preferenceService.savePreference({
        userId,
        type,
        targetId,
        reason: reason || "NOT_INTERESTED",
      });

      return successResponse(
        res,
        201,
        `We'll show you less of this ${type.toLowerCase()}.`,
        preference,
      );
    } catch (error) {
      return errorResponse(res, 500, "Internal server error", error.message);
    }
  }),
);

export default router;

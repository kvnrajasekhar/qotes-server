// @ts-nocheck
import express from "express";
import asyncHandler from "express-async-handler";
import authMiddleware from "../../shared/middlewares/auth.middleware";
import reactionService from "./reaction.service";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/responseFormatter.util";

const router = express.Router();

router.post(
  "/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { type } = req.body;
    if (!type) {
      return errorResponse(res, 400, "Reaction type is required");
    }
    const quoteId = req.params.id;
    const userId = req.user.userId;
    const result = await reactionService.toggleReaction({
      userId,
      quoteId,
      type,
    });
    return successResponse(
      res,
      200,
      "Quote reaction toggled successfully",
      result,
    );
  }),
);

router.get(
  "/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id: quoteId } = req.params;
    const { type, cursor, limit = 20 } = req.query;
    const userId = req.user.id;

    const result = await reactionService.getQuoteReactions({
      quoteId,
      viewerId: userId,
      type,
      cursor,
      limit: parseInt(limit),
    });

    return successResponse(
      res,
      200,
      "Quote reactions retrieved successfully",
      result,
    );
  }),
);
export default router;

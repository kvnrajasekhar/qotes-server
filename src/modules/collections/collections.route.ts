// @ts-nocheck
import express from "express";
const router = express.Router();
import collectionService from "./collections.service";
import asyncHandler from "express-async-handler";
import authMiddleware from "../../shared/middlewares/auth.middleware";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/responseFormatter.util";

router.get(
  "/",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query;

    const data = await collectionService.getUserCollections({
      userId: req.user._id,
      cursor,
      limit: parseInt(limit) || 20,
    });

    return successResponse(res, 200, "Collections fetched successfully", data);
  }),
);

router.get(
  "/:collectionId/items",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { collectionId } = req.params;
    const { cursor, limit } = req.query;

    const data = await collectionService.getCollectionDetails({
      collectionId,
      cursor,
      limit: parseInt(limit) || 20,
    });

    return successResponse(res, 200, "Collection items retrieved", data);
  }),
);

router.get(
  "/q/:quoteId",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    const userId = req.user._id;
    const data = await collectionService.getQuoteDetails(quoteId, userId);

    return successResponse(res, 200, "Quote details retrieved", data);
  }),
);

router.post(
  "/:quoteId/toggle-save",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    const userId = req.user._id;
    const { collectionId } = req.body; // Optional
    const data = await collectionService.toggleSave(
      userId,
      quoteId,
      collectionId,
    );

    return successResponse(res, 200, "Toggle save status", data);
  }),
);

export default router;

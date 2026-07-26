import express from 'express';
import asyncHandler from 'express-async-handler';
import authMiddleware from '../../shared/middlewares/auth.middleware';
import feedService from './feed.service';
import { successResponse } from '../../shared/utils/responseFormatter.util';

const router = express.Router();

router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { cursor, limit } = req.query;
    const result = await feedService.getGlobalFeed({
      userId: req.user._id,
      cursor: cursor || null,
      limit: parseInt(limit as string) || 10,
    });
    return successResponse(res, 200, 'Quotes retrieved successfully', result);
  })
);

router.get(
  '/following',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { cursor, limit = 10 } = req.query;
    const result = await feedService.getFollowingFeed({
      userId: req.user._id,
      cursor,
      limit: parseInt(limit as string, 10) || 10,
    });
    return successResponse(res, 200, 'Feed loaded', result);
  })
);

router.get(
  '/discover',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { cursor, limit = 10 } = req.query;
    const result = await feedService.getDiscoverFeed({
      userId: req.user._id,
      cursor,
      limit: parseInt(limit as string, 10) || 10,
    });
    return successResponse(res, 200, 'Discover feed loaded', result);
  })
);

router.get(
  '/q/:targetuserId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { targetuserId } = req.params;
    const { cursor, limit } = req.query;
    const result = await feedService.getUserQuotes({
      targetUserId: targetuserId,
      viewerId: req.user._id,
      cursor: cursor || null,
      limit: parseInt(limit as string) || 10,
    });
    return successResponse(res, 200, 'User quotes retrieved successfully', result);
  })
);

export default router;

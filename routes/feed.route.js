const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const authMiddleware = require('../middlewares/auth.middleware');
const feedService = require('../services/feed.service');
const { successResponse, errorResponse } = require('../utils/responseFormatter.util');

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
    let { cursor, limit } = req.query;
    cursor = parseInt(cursor) || 1;
    limit = parseInt(limit) || 10;
    const result = await feedService.getGlobalFeed(cursor, limit);
    return successResponse(res, 200, 'Quotes retrieved successfully', result);
}));

router.get('/following', authMiddleware, asyncHandler(async (req, res) => {
  const { cursor, limit = 10 } = req.query;
  const result = await feedService.getFollowingFeed({
    userId: req.user._id,
    cursor,
    limit: parseInt(limit)
  });
  return successResponse(res, 200, 'Feed loaded', result);
}));

router.get('/discover', authMiddleware, asyncHandler(async (req, res) => {
  const { cursor, limit = 10 } = req.query;
  const result = await feedService.getDiscoverFeed({
    userId: req.user._id,
    cursor,
    limit: parseInt(limit)
  });
  return successResponse(res, 200, 'Discover feed loaded', result);
}));


router.get('/q/:userId', authMiddleware, asyncHandler(async (req, res) => {
    const { userId } = req.params;
    let { cursor, limit } = req.query;
    cursor = parseInt(cursor) || 1;
    limit = parseInt(limit) || 10;
    const result = await feedService.getUserQuotes(userId, cursor, limit);
    return successResponse(res, 200, 'User quotes retrieved successfully', result);
}));

module.exports = router;


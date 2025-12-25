const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const authMiddleware = require('../middlewares/auth.middleware');
const feedService = require('../services/feed.service');
const { successResponse, errorResponse } = require('../utils/responseFormatter.util');

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const result = await feedService.pagination(page, limit);
    return successResponse(res, 200, 'Quotes retrieved successfully', result);
}));

router.get('/following', authMiddleware, asyncHandler(async (req, res) => {
    let { cursor, limit } = req.query;
    limit = parseInt(limit) || 10;
    const userId = req.user._id;
    const result = await feedService.getFollowingFeed({ userId, cursor, limit });
    return successResponse(res, 200, 'Following quotes retrieved successfully', result);
}));

router.get('/discover', authMiddleware, asyncHandler(async (req, res) => {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const result = await feedService.getDiscoverFeed(page, limit);
    return successResponse(res, 200, 'Discover quotes retrieved successfully', result);
}));

router.get('/q/:userId', authMiddleware, asyncHandler(async (req, res) => {
    const { userId } = req.params;
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const result = await feedService.getUserQuotes(userId, page, limit);
    return successResponse(res, 200, 'User quotes retrieved successfully', result);
}));

module.exports = router;


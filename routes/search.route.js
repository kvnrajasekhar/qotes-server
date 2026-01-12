const router = require('express').Router();
const authMiddleware = require('../middlewares/auth.middleware');
const asyncHandler = require('express-async-handler');
const searchService = require('../services/search.service');
const { successResponse, errorResponse } = require('../utils/responseFormatter.util');

router.get('/users', asyncHandler(async (req, res) => {
    const query = req.query.q || '';
    const { cursor, limit } = req.query;
    console.log("Search query:", query);
    const users = await searchService.searchUsers({ query, cursor, limit });
    return successResponse(res, 200, 'User search completed successfully', users);
}));

router.get('/global', asyncHandler(async (req, res) => {
    const query = req.query.q || '';
    const type = req.query.type || 'all';
    const limit = parseInt(req.query.limit, 10) || 20;
    const cursor = req.query.cursor || null;

    const results = await searchService.searchGlobal({ query, type, limit, cursor });
    return successResponse(res, 200, 'Global search completed successfully', results);
}));
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const authMiddleware = require('../middlewares/auth.middleware');
const reactionService = require('../services/reaction.service');
const { successResponse, errorResponse } = require('../utils/responseFormatter.util');

router.post('/:id', authMiddleware, asyncHandler(async (req, res) => {
    const { type } = req.body;
    if (!type) {
        return errorResponse(res, 400, 'Reaction type is required');
    }
    const quoteId = req.params.id;
    const userId = req.user.userId;
    const result = await reactionService.toggleReaction({ userId, quoteId, type });
    return successResponse(res, 200, 'Quote reaction toggled successfully', result);
}));

router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
    const { id: quoteId } = req.params;
    const { type, cursor, limit = 20 } = req.query;
    const userId = req.user.id;

    const result = await reactionService.getQuoteReactions({
        quoteId,
        viewerId: userId,
        type,
        cursor,
        limit: parseInt(limit)
    });

    return successResponse(
        res,
        200,
        'Quote reactions retrieved successfully',
        result
    );
}));
module.exports = router;
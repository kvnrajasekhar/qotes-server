const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const authMiddleware = require('../middlewares/auth.middleware');
const quoteService = require('../services/quote.service');
const { successResponse, errorResponse } = require('../utils/responseFormatter.util');

router.post('/', authMiddleware, asyncHandler(async (req, res) => {
    console.log("DEBUG: Keys in req.user:", Object.keys(req.user));
    console.log("DEBUG: Value of req.user.id:", req.user.id);
    console.log("DEBUG: Value of req.user._id:", req.user._id);
    const {
        text,
        author,
        category,
        hashtags,
        taggedUsers,
        isRequote = false,
        parentQuoteId = null,
        isHiddenBySystem = false,
    } = req.body;

    // Normal quote must have text
    if (!isRequote && !text) {
        return errorResponse(res, 400, 'Quote text is required');
    }

    // Requote must have parentQuoteId
    if (isRequote && !parentQuoteId) {
        return errorResponse(res, 400, 'Parent quote ID is required for requote');
    }

    const newQuote = await quoteService.createQuote({
        text: text || '',
        author,
        category: category || '',
        hashtags: hashtags || [],
        taggedUsers: taggedUsers || [],
        creator: req.user.userId,
        isRequote,
        parentQuoteId,
        isHiddenBySystem,
    });

    if (!newQuote) {
        return errorResponse(res, 500, 'Failed to create quote');
    }

    return successResponse(
        res,
        201,
        isRequote ? 'Requote created successfully' : 'Quote created successfully',
        newQuote
    );

}));

router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
    const quoteId = req.params.id;
    const quote = await quoteService.getQuoteById(quoteId);
    if (!quote) {
        return errorResponse(res, 404, 'Quote not found');
    }
    return successResponse(res, 200, 'Quote retrieved successfully', quote);
}));

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
    const quotes = quoteService.getAllQuotes();
    return successResponse(res, 200, 'Quotes retrieved successfully', quotes);
}));

router.patch('/:id', authMiddleware, asyncHandler(async (req, res) => {
    const quoteId = req.params.id;
    const updateData = req.body;
    const updatedQuote = quoteService.updateQuote(quoteId, updateData);
    if (!updatedQuote) {
        return errorResponse(res, 404, 'Quote not found or update failed');
    }
    return successResponse(res, 200, 'Quote updated successfully', updatedQuote);
}));

router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
    const quoteId = req.params.id;
    const deletedQuote = quoteService.deleteQuote(quoteId);
    if (!deletedQuote) {
        return errorResponse(res, 404, 'Quote not found or deletion failed');
    }
    return successResponse(res, 200, 'Quote deleted successfully', deletedQuote);
}));

router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { cursor, limit } = req.query;
    const userQuotes = quoteService.getQuotesByUser(userId, cursor, limit);
    if (!userQuotes) {
        return errorResponse(res, 404, 'No quotes found for this user');
    }
    return successResponse(res, 200, 'User quotes retrieved successfully', userQuotes);
}));







module.exports = router;
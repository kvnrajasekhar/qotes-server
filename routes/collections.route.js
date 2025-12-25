const express = require('express');
const router = express.Router();
const collectionService = require('../services/collections.service');
const authMiddleware = require('../middlewares/auth.middleware');
const { successResponse, errorResponse } = require('../utils/responseFormatter.util');


router.get('/', authMiddleware, asyncHandler(async (req, res) => {
    try {
        const collections = await collectionService.getUserCollections(req.user._id);
        return successResponse(res, 200, "Collections fetched successfully", collections);
    } catch (err) {
        return errorResponse(res, 500, "Failed to fetch collections", err.message);
    }
}));

router.get('/:collectionId/items', authMiddleware, asyncHandler(async (req, res) => {
    const { collectionId } = req.params;
    const page = parseInt(req.query.page) || 1;

    const data = await collectionService.getCollectionDetails(collectionId, page);

    return successResponse(res, 200, "Collection items retrieved", data);
}));

router.get('/q/:quoteId', authMiddleware, asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    const userId = req.user._id;
    const data = await collectionService.getQuoteDetails(quoteId, userId);

    return successResponse(res, 200, "Quote details retrieved", data);
}));

router.post('/:quoteId/toggle-save', authMiddleware, asyncHandler(async (req, res) => {
    const { quoteId } = req.params;
    const userId = req.user._id;
    const { collectionId } = req.body; // Optional
    const data = await collectionService.toggleSave(userId, quoteId, collectionId);

    return successResponse(res, 200, "Toggle save status", data);
}));

module.exports = router;
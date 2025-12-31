// Handling Not Interested (User Experience)
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { successResponse, errorResponse } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler.util');
const preferenceService = require('../services/preference.service');

router.post('/not-interested', authMiddleware, asyncHandler(async (req, res) => {
    try {
        const { type, targetId, reason } = req.body;
        const userId = req.user.id; 

        // Validate type against your model's enum: ["QUOTE", "AUTHOR", "TAG"]
        if (!["QUOTE", "AUTHOR", "TAG"].includes(type)) {
            return errorResponse(res, 400, "Invalid type");
        }

        const preference = await preferenceService.savePreference({userId, type, targetId, reason:reason || "NOT_INTERESTED"});

        return successResponse(res, 201, `We'll show you less of this ${type.toLowerCase()}.`, preference);
    } catch (error) {
        return errorResponse(res, 500, "Internal server error", error.message);
    }
}));


module.exports = router;
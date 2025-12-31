// Block & Report User
const express = require('express');
const router = express.Router();
const safetyService = require('../services/safety.service');
const {successResponse, errorResponse} = require('../utils/response.util');
const asyncHandler = require('../middlewares/async.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

// Block a user
router.post('/toggle-block', authMiddleware, asyncHandler(async (req, res) => {
    const {blockedId} = req.body;
    const blockerId = req.user.id;
    const result = await safetyService.toggleBlockUser(blockerId, blockedId);
    if (!result) {
        return errorResponse(res, 400,'Unable to block/unblock user', null);
    }
    return successResponse( res, 200, 'User blocked/unblocked successfully', result);
}));

router.post('/report', authMiddleware, asyncHandler(async (req, res) => {
    const reporterId = req.user.id;
    const { targetId, targetType,reason } = req.body;
    const result = await safetyService.report(reporterId, targetType, targetId, reason);
    if (!result) {
        return errorResponse(res, 400, 'Unable to report user', null);
    }
    return successResponse(res, 200, 'User reported successfully', result);

}));

module.exports = router;
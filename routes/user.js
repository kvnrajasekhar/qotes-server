const express = require('express');
const router = express.Router();
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const authMiddleware = require('../middlewares/authMiddleware');
const userService = require('../services/userService');
const upload = require('../middlewares/uploadMiddleware');
const { errorResponse, successResponse } = require('../utils/responseFormatter');

router.get('/:username', authMiddleware, asyncHandler(async (req, res) => {
    const username = req.params.username;
    const user = await User.findOne({ username: username }).select('-password');
    if (!user) {
        return errorResponse(res, 404, 'User not found');
    }
    return successResponse(res, 200, 'User retrieved successfully', user);
}));


router.get('/profile/me', authMiddleware, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
        return errorResponse(res, 404, 'User not found');
    }
    return successResponse(res, 200, 'User profile retrieved successfully', user);
}));


router.patch('/profile/me', authMiddleware, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { firstName, lastName, email } = req.body;
    try {
        const updateUserProfile = userService.updateUserProfile(
            userId,
            { firstName, lastName, email }
        );
        if (!updateUserProfile) {
            return errorResponse(res, 404, 'User not found');
        }
        return successResponse(res, 200, 'User profile updated successfully', updateUserProfile);
    } catch (err) {
        return errorResponse(res, 400, err.message);
    }
}));


router.put('/avatar',
    authMiddleware,
    upload.single('avatar'),
    asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const avatarFile = req.file;

        if (!avatarFile) {
            return errorResponse(res, 400, 'No image file uploaded.');
        }

        try {
            // Delegate ALL core logic to the service
            // Service handles upload, old image deletion, DB update, and temp file cleanup.
            const updatedUser = await userService.updateUserAvatar(userId, avatarFile);

            return successResponse(res, 200, 'Avatar updated successfully.', {
                avatarUrl: updatedUser.avatar
            });

        } catch (error) {
            console.error('Avatar update failed:', error.message);

            // Handle specific errors thrown by the service
            if (error.message.includes('User not found')) {
                return errorResponse(res, 404, error.message);
            }
            // Default to 500 for Cloudinary/DB errors
            return errorResponse(res, 500, error.message || 'Failed to update avatar.');
        }
    })
);


module.exports = router;
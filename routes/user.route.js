const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const authMiddleware = require('../middlewares/auth.middleware');
const userService = require('../services/user.service');
const upload = require('../middlewares/upload.middleware');
const { errorResponse, successResponse } = require('../utils/responseFormatter.util');


router.get('/suggested', authMiddleware, asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    const userId = req.user ? req.user.id : null;
    const suggestedUsers = await userService.getSuggestedUsers({ userId, limit });
    return successResponse(res, 200, 'Suggested users retrieved successfully', suggestedUsers);
}));

router.get('/suggested/public', asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    const suggestedUsers = await userService.getSuggestedUsers({ userId: null, limit });
    return successResponse(res, 200, 'Public suggested users retrieved successfully', suggestedUsers);
}));

router.get('/u/:username', asyncHandler(async (req, res) => {
    const username = req.params.username;
    const user = await userService.getUserByUsername(username, req.user ? req.user.id : null);
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

router.post('/follow/:id', authMiddleware, asyncHandler(async (req, res) => {
    const followerId = req.user.userId; // From JWT
    const targetId = req.params.id;     // From URL

    const result = await userService.toggleFollow(followerId, targetId);
    return successResponse(res, 200, result.message, { followed: result.followed });
}));

router.get('/:userId/requotes', authMiddleware, asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { cursor, limit } = req.query;

    const targetUserId =
        userId === 'me' ? req.user.id : userId;

    const data = await userService.getRequotes({
        userId: targetUserId,
        cursor,
        limit: parseInt(limit) || 20
    });

    return successResponse(res, 200, 'Requotes fetched', data);
})
);

router.get('/me/following', authMiddleware, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const currentUserId = req.user.id;
    const { cursor, limit } = req.query;
    const data = await userService.getFollowing({
        userId,
        currentUserId,
        cursor,
        limit: parseInt(limit) || 20
    });
    return successResponse(res, 200, 'Following fetched', data);
}));

router.get('/me/followers', authMiddleware, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const currentUserId = req.user.id;
    const { cursor, limit } = req.query;
    const data = await userService.getFollowers({
        userId,
        currentUserId,
        cursor,
        limit: parseInt(limit) || 20
    });
    return successResponse(res, 200, 'Followers fetched', data);
}));

router.get('/:userId/followers', authMiddleware, asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { cursor, limit } = req.query;
    const currentUserId = req.user.id;
    const data = await userService.getFollowers({
        userId,
        currentUserId,
        cursor,
        limit: parseInt(limit) || 20
    });
    return successResponse(res, 200, 'Followers fetched', data);
}));
router.get('/:userId/following', authMiddleware, asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { cursor, limit } = req.query;
    const currentUserId = req.user.id;
    const data = await userService.getFollowing({
        userId,
        currentUserId,
        cursor,
        limit: parseInt(limit) || 20
    });
    return successResponse(res, 200, 'Following fetched', data);
}));



module.exports = router;
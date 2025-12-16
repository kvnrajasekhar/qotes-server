const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

const { successResponse, errorResponse } = require('../utils/responseFormatter');
const authService = require('../services/authService');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const fs = require('fs/promises');

const JWT_SECRET = process.env.JWT_SECRET; // Move global secrets to the top
const REFRESH_SECRET = process.env.REFRESH_SECRET;


router.post('/login', asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    const { accessToken, refreshToken, userId } =
        await authService.login(identifier, password);

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return successResponse(res, 200, 'Login successful', {
        accessToken,

        userId
    });
}));


router.post('/signup',
    upload.single('avatar'),
    asyncHandler(async (req, res) => {

        const { username, email, password, firstName, lastName,bio } = req.body;
        const avatarFile = req.file || null;
        const existingUser = await authService.findUserByUsernameOrEmail(username);
        if (existingUser) {
            // If the user already exists, we must manually clean up the file here
            if (avatarFile) await fs.unlink(avatarFile.path);
            return errorResponse(res, 409, 'Username already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Delegate ALL saving, uploading, and cleanup to the service
        // The service will handle the file upload, DB save, and temp file cleanup.
        await authService.saveUser(
            username,
            email,
            hashedPassword,
            firstName,
            lastName,
            bio,
            avatarFile
        );

        // No cleanup logic needed here on success/failure, as the service handles it.
        return successResponse(res, 201, 'User registered successfully');
    })
);


router.post('/logout', asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
        await authService.deleteRefreshToken(refreshToken);
    }

    res.clearCookie('refreshToken');
    return successResponse(res, 200, 'Logged out successfully');
}));


router.post('/refresh', asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return errorResponse(res, 401, 'Refresh token not found');
    }

    const { accessToken } =
        await authService.refreshAccessToken(refreshToken);

    return successResponse(res, 200, 'Token refreshed successfully', {
        accessToken
    });
}));

router.post('/forgot-password', asyncHandler(async (req, res) => {
    const { email } = req.body;

    // The service handles the user existence check internally for security.
    const result = await authService.generateResetTokenAndSendEmail(email);

    // to prevent user enumeration, even if the user wasn't found in the service.
    return successResponse(res, 200, result.message);
}));



const postResetPassword = asyncHandler(async (req, res) => {
    const id = req.params.userId;
    const token = req.params.token;
    const { newPassword, cnfPassword } = req.body;

    try {
        const result = await authService.resetPasswordWithToken(
            id,
            token,
            newPassword,
            cnfPassword
        );

        return successResponse(res, 200, result.message);

    } catch (err) {
        const message = err.message;

        if (message.includes("Invalid reset link")) {
            return errorResponse(res, 404, message);
        } else if (message.includes("expired") || message.includes("match")) {
            // Expired token or password mismatch -> 400/403
            return errorResponse(res, 400, message);
        }

        // Default catch for unexpected errors
        console.error("Reset password failed:", err);
        return errorResponse(res, 500, "Internal Server Error");
    }
});

router.post('/resetForgotPassword/:userId/:token', postResetPassword);

router.post('/update-password', authMiddleware, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    try {
        const result = await authService.updateUserPassword(
            userId,
            oldPassword,
            newPassword,
            confirmPassword
        );

        // Security: Clear the client-side refresh token cookie after a successful password change
        res.clearCookie('refreshToken');

        return successResponse(res, 200, result.message);

    } catch (err) {
        const message = err.message;

        if (message.includes("not match") || message.includes("Current password incorrect")) {
            return errorResponse(res, 400, message); // Bad Request
        }

        console.error("Password update failed:", err);
        return errorResponse(res, 500, "Internal Server Error");
    }
}));

module.exports = router;
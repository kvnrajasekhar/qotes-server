const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const fs = require('fs/promises');

// Middlewares & Utils
const { successResponse, errorResponse } = require('../../shared/utils/responseFormatter.util');
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const upload = require('../../shared/middlewares/upload.middleware');
const { createRateLimiter } = require('../../shared/middlewares/rateLimiter.middleware');

// Services
const authService = require('./auth.service');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

// ==========================================
// RATE LIMITERS CONFIGURATION
// ==========================================

const loginLimiter = createRateLimiter({
    actionName: 'login',
    burstWindowMs: 60 * 1000,      // 1 minute
    burstLimit: 5,                 // 5 attempts per minute
    sustainedWindowMs: 3600 * 1000, // 1 hour
    sustainedLimit: 20,            // Max 20 attempts per hour
    identifier: 'ip'
});

const signupLimiter = createRateLimiter({
    actionName: 'signup',
    burstWindowMs: 60 * 1000,      // 1 minute
    burstLimit: 3,                 // 3 accounts per minute
    sustainedWindowMs: 3600 * 1000, // 1 hour
    sustainedLimit: 10,            // Max 10 accounts per hour
    identifier: 'ip'
});

const passwordResetLimiter = createRateLimiter({
    actionName: 'password_reset',
    burstWindowMs: 60 * 1000,      // 1 minute
    burstLimit: 3,                 // 3 requests per min
    sustainedWindowMs: 3600 * 1000, // 1 hour
    sustainedLimit: 5,             // Max 5 reset requests per hour
    identifier: 'ip'
});

const tokenRefreshLimiter = createRateLimiter({
    actionName: 'token_refresh',
    burstWindowMs: 60 * 1000,      // 1 minute
    burstLimit: 10,                // 10 refreshes per min
    sustainedWindowMs: 3600 * 1000, // 1 hour
    sustainedLimit: 50,            // Max 50 per hour
    identifier: 'ip'
});

const updatePasswordLimiter = createRateLimiter({
    actionName: 'update_password',
    burstWindowMs: 60 * 1000,      // 1 minute
    burstLimit: 3,                 // 3 attempts per minute
    sustainedWindowMs: 3600 * 1000, // 1 hour
    sustainedLimit: 10,            // Max 10 per hour
    identifier: 'userId'           // Target authenticated user ID
});


// ==========================================
// ROUTES
// ==========================================

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    const result = await authService.login(identifier, password);

    if (!result) {
        return errorResponse(res, 401, 'Invalid credentials');
    }

    res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return successResponse(res, 200, 'Login successful', {
        accessToken: result.accessToken,
        userId: result.userId
    });
}));

router.post('/signup',
    signupLimiter, // CRITICAL: Limiter goes BEFORE file upload to prevent disk/memory spam
    upload.single('avatar'),
    asyncHandler(async (req, res) => {
        const { username, email, password, firstName, lastName, bio } = req.body;
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

router.post('/refresh', tokenRefreshLimiter, asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return errorResponse(res, 401, 'Refresh token not found');
    }

    const { accessToken } = await authService.refreshAccessToken(refreshToken);

    return successResponse(res, 200, 'Token refreshed successfully', {
        accessToken
    });
}));

router.post('/forgot-password', passwordResetLimiter, asyncHandler(async (req, res) => {
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

router.post('/forgotpassword/:userId/:token', passwordResetLimiter, postResetPassword);

router.post('/update-password', 
    authMiddleware, 
    updatePasswordLimiter, 
    asyncHandler(async (req, res) => {
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
    })
);

module.exports = router;

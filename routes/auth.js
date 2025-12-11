const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { successResponse, errorResponse } = require('../utils/responseFormatter');
const authService = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET; // Move global secrets to the top
const REFRESH_SECRET = process.env.REFRESH_SECRET;


router.post('/login', async (req, res) => {
    const { identifier, password } = req.body;
    const user = await authService.findUserByUsername(identifier);
    if (!user) {
        return errorResponse(res, 401, 'Invalid credentials');
    }

    try {
        const isvalidPassword = await bcrypt.compare(password, user.password);
        if (!isvalidPassword) {
            return errorResponse(res, 401, 'Invalid credentials');
        }
        
        const payload = {
            userId: user._id,
            username: user.username 
        };

        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }); // Short-lived (recommended)
        const refreshToken = jwt.sign({ userId: user._id }, REFRESH_SECRET, { expiresIn: '7d' });

        await authService.saveRefreshToken(user._id, refreshToken);
        
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        return successResponse(res, 200, 'Login successful', {
            accessToken: accessToken,
            userId: user._id
        });
    } catch (error) {
        console.error('Error during login:', error);
        return errorResponse(res, 500, 'Internal server error'); // Ensure return here
    }
});


router.post('/signup', async (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;
    const existingUser = await authService.findUserByUsername(username);
    if (existingUser) {
        return errorResponse(res, 409, 'Username already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    // Assumes authService.saveUser handles user creation and returns a promise
    await authService.saveUser(username, email, hashedPassword, firstName, lastName); 
    return successResponse(res, 201, 'User registered successfully');
});


router.post('/logout', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
        await authService.deleteRefreshToken(refreshToken);
    }
    
    res.clearCookie('refreshToken');
    return successResponse(res, 200, 'Logged out successfully');
});


router.post('/refresh', async (req, res) => {
    // 1. Get the Refresh Token from the HTTP-only cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return errorResponse(res, 401, 'Refresh token not found');
    }

    try {
        // 2. Verify the Refresh Token signature and expiration
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
        const userId = decoded.userId;

        // 3. Look up the Refresh Token in the database (security check: token must be active)
        const tokenRecord = await authService.findToken(refreshToken);

        if (!tokenRecord || tokenRecord.userId.toString() !== userId) {
            // Token is compromised, log out user
            res.clearCookie('refreshToken');
            return errorResponse(res, 403, 'Invalid refresh token state');
        }
        
        const user = await authService.findUserById(userId); 
        if (!user) {
            res.clearCookie('refreshToken');
            return errorResponse(res, 403, 'User not found');
        }

        // 4. Issue a New Access Token
        const newAccessToken = jwt.sign(
            { userId: user._id, username: user.username }, 
            JWT_SECRET, 
            { expiresIn: '15m' } 
        );

        return successResponse(res, 200, 'Token refreshed successfully', {
            accessToken: newAccessToken
        });
    } catch (err) {
        // Refresh token is expired or invalid
        res.clearCookie('refreshToken');
        return errorResponse(res, 403, 'Expired or invalid refresh token');
    }
});

module.exports = router;
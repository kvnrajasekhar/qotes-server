require('dotenv').config();
const User = require('../models/user.model');
const Token = require('../models/token.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const passwordMailer = require('../mailer/forgotPasswordMailer');
const fs = require('fs/promises');
const cloudinaryService = require('./cloudinary.service');
const { producer } = require('../config/kafka.config');
const authService = {


    /**
     * @param {string} identifier
     */
    findUserByUsernameOrEmail: async (identifier) => {
        return await User.findOne({
            $or: [
                { username: identifier },
                { email: identifier }
            ]
        }).select('+password');
    },

    login: async (identifier, password) => {
        const user = await authService.findUserByUsernameOrEmail(identifier);
        if (!user) return null;

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) return null;

        const JWT_SECRET = process.env.JWT_SECRET;
        const REFRESH_SECRET = process.env.REFRESH_SECRET;

        const payload = {
            userId: user._id,
            username: user.username
        };

        const accessToken = jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '25m' }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        await authService.saveRefreshToken(user._id, refreshToken);
        try {
            await producer.send({
                topic: 'auth-events',
                messages: [{
                    key: user._id.toString(),
                    value: JSON.stringify({ userId: user._id, action: 'login_warmup' })
                }]
            });
        } catch (kafkaErr) {
            // We log but don't stop the login. If Kafka fails, 
            // the "Read-Repair" in the Reaction Service will catch it later.
            console.error("Cache warm-up trigger failed:", kafkaErr);
        }

        return {
            accessToken,
            refreshToken,
            userId: user._id
        };
    },

    /** * @param {string} username
 * @param {string} email
 * @param {string} hashedPassword
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} bio
 * @param {object | null} avatarFile 
 */
    saveUser: async (username, email, hashedPassword, firstName, lastName, bio, avatarFile) => {
        let avatarUrl = null;
        let filePath = avatarFile ? avatarFile.path : null;

        try {
            if (avatarFile) {
                // Upload to Cloudinary. The folder is 'qotes-app/avatars' by default.
                avatarUrl = await cloudinaryService.uploadImage(filePath);
            }

            const newUser = new User({
                username,
                email,
                password: hashedPassword,
                firstName,
                lastName,
                bio,
                avatarUrl: avatarUrl
            });

            const savedUser = await newUser.save();

            // 3. Cleanup temporary file after successful database save
            if (filePath) await fs.unlink(filePath);

            return savedUser;

        } catch (error) {
            // Critical: Ensure the temporary file is deleted even if Cloudinary or DB save fails
            if (filePath) {
                await fs.unlink(filePath).catch(err => console.error("Cleanup error after service failure:", err));
            }

            // Re-throw the error so the controller can catch and respond 500
            throw error;
        }
    },

    saveRefreshToken: async (userId, token) => {
        // Delete any old refresh tokens for this user first (optional, but good for single session)
        await Token.deleteMany({ userId: userId });
        const newToken = new Token({ userId, refreshToken: token });
        return await newToken.save();
    },

    savePasswordResetToken: async (userId, token, expiresAt) => {
        const resetToken = new Token({ userId, passwordResetToken: token, expiresAt });
        return await resetToken.save();
    },

    deleteRefreshToken: async (token) => {
        return await Token.deleteOne({ refreshToken: token });
    },

    findToken: async (token) => {
        return await Token.findOne({ refreshToken: token });
    },

    /**
     * @param {string} userId
     */
    findUserById: async (userId) => {
        // We need to explicitly select the password hash for token signing/verification
        return await User.findById(userId).select('+password');
    },

    refreshAccessToken: async (refreshToken) => {
        let decoded;

        try {
            decoded = jwt.verify(refreshToken, authService.REFRESH_SECRET);
        } catch (err) {
            throw { status: 403, message: 'Expired or invalid refresh token' };
        }

        const userId = decoded.userId;

        const tokenRecord = await authService.findToken(refreshToken);
        if (!tokenRecord || tokenRecord.userId.toString() !== userId) {
            throw { status: 403, message: 'Invalid refresh token state' };
        }

        const user = await authService.findUserById(userId);
        if (!user) {
            throw { status: 403, message: 'User not found' };
        }

        const newAccessToken = jwt.sign(
            { userId: user._id, username: user.username },
            authService.JWT_SECRET,
            { expiresIn: '15m' }
        );

        return { accessToken: newAccessToken };
    },

    /**
     * @param {string} email 
     * @returns {object} 
     */
    generateResetTokenAndSendEmail: async (email) => {
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            // Security Best Practice: Return success even if user not found to prevent enumeration
            return { success: true, message: "If account exists, email sent" };
        }
        const JWT_SECRET = process.env.JWT_SECRET;
        const LOCALHOST = process.env.LOCALHOST || 'http://localhost:3030'; // this is for the Client localhost UI url
        const secret = JWT_SECRET + user.password;

        const payload = {
            email: user.email,
            id: user._id,
        };

        const token = jwt.sign(payload, secret, {
            expiresIn: "15m",
        });

        // 4. Construct the reset link (Assuming client-side route is /resetForgotPassword/:userId/:token)
        const link = `${LOCALHOST}/forgotpassword/${user._id}/${token}`;

        passwordMailer.forgotPasswordLink(user.email, link);

        return { success: true, message: "A password reset link has been sent to your email" };
    },

    /**
     * Validates the reset token and updates the user's password
     * @param {string} userId - The ID of the user from the URL params.
     * @param {string} token - The JWT token from the URL params.
     * @param {string} newPassword
     * @param {string} cnfPassword 
     * @returns {object} 
     */
    resetPasswordWithToken: async (userId, token, newPassword, cnfPassword) => {

        if (newPassword !== cnfPassword) {
            // Throwing an Error is preferred over returning an object for failure in service layer
            throw new Error("Passwords didn't match");
        }

        const validUser = await User.findOne({ _id: userId }).select('+password');

        if (!validUser) {
            throw new Error("Invalid reset link. User not found.");
        }

        // 2. Verify the JWT token using the secret derived from the old password hash
        const secret = JWT_SECRET + validUser.password;
        let payload;
        try {
            payload = jwt.verify(token, secret);
        } catch (error) {
            // Token expired, signature invalid, or other JWT error
            throw new Error("Password reset link is invalid or has expired");
        }

        const hashPassword = await bcrypt.hash(newPassword, 10);

        // 4. Update the user's password
        const user = await User.findOneAndUpdate(
            { _id: payload.id, email: payload.email },
            { password: hashPassword },
            { new: true }
        );

        if (!user) {
            // This should rarely happen if token verification succeeded, but is a fail-safe
            throw new Error("User not found during update");
        }

        return { success: true, message: "Password updated successfully" };
    },

    /**
 * @param {string} userId 
 * @param {string} oldPassword 
 * @param {string} newPassword 
 * @param {string} confirmPassword 
 * @returns {object}
 */
    updateUserPassword: async (userId, oldPassword, newPassword, confirmPassword) => {
        //Find user, explicitly selecting the password hash
        const user = await User.findById(userId).select('+password');

        if (!user) {
            throw new Error("User account not found.");
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            throw new Error("Current password incorrect.");
        }
        if (newPassword !== confirmPassword) {
            throw new Error("New passwords do not match.");
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // 5. Save the new password hash
        // Using save() triggers pre-save middleware (if you have one for hashing), 
        // but findByIdAndUpdate is cleaner for a direct update here.
        await User.findByIdAndUpdate(
            userId,
            { $set: { password: hashedNewPassword } },
            { new: true }
        );

        // 6. Security Step: Log out all other sessions by deleting the Refresh Token from DB
        await Token.deleteMany({ userId: userId });

        return { success: true, message: "Password updated successfully. Please log in again." };
    },
};

module.exports = authService;
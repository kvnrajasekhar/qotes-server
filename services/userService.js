const User = require('../models/User');
const cloudinaryService = require('./cloudinaryService');
const fs = require('fs/promises');

const userService = {
    /**
     * @param {String} userId - The ID of the user to update
     * @param {Object} updateData - An object containing the fields to update
     * @returns {Object|null} - The updated user object or null if not found
     */
    updateUserProfile: async (userId, updateData) => {
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');
        return updatedUser;
    },

    /**
         * Updates the user's avatar, handles Cloudinary upload, old image deletion, and file cleanup.
         * @param {string} userId - ID of the user from the JWT.
         * @param {object} avatarFile - The file object from Multer (req.file).
         * @returns {User} - The updated user document.
         */
    updateUserAvatar: async (userId, avatarFile) => {
        let newAvatarUrl = null;
        let filePath = avatarFile.path;

        const user = await User.findById(userId).select('avatar');
        if (!user) {
            throw new Error("User not found.");
        }

        try {
            //Upload the NEW image to Cloudinary first (High priority)
            newAvatarUrl = await uploadImage(filePath);

            //  Delete OLD Image (if one exists)
            if (user.avatar) {
                const oldPublicId = getPublicIdFromUrl(user.avatar);

                if (oldPublicId) {
                    await deleteImage(oldPublicId);
                }
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: { avatar: newAvatarUrl } },
                { new: true, select: '-password' } // Return the updated document without the password
            );

            //Cleanup local file
            await fs.unlink(filePath);

            return updatedUser;

        } catch (error) {
            // CRITICAL: Cleanup local file path on failure
            if (filePath && fs.existsSync(filePath)) {
                await fs.unlink(filePath).catch(err => console.error("Cleanup error:", err));
            }

            // If upload succeeded but DB failed, new image is orphaned. 
            // If delete failed, old image is orphaned. Re-throw the main error.
            throw error;
        }
    },
};

module.exports = userService;

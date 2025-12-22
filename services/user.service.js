const { get } = require('http');
const User = require('../models/user.model');
const Follow = require('../models/follow.model');
const cloudinaryService = require('./cloudinary.service');
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

    searchUsers: async (query) => {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Regex patterns for different match types
        const exactRegex = new RegExp(`^${escaped}$`, 'i');       // exact match
        const prefixRegex = new RegExp(`^${escaped}`, 'i');       // starts with
        const containsRegex = new RegExp(escaped, 'i');           // contains anywhere

        return await User.aggregate([
            {
                // 1️ Add a 'score' field based on relevance
                $addFields: {
                    score: {
                        $add: [
                            // Exact username match → highest priority
                            { $cond: [{ $regexMatch: { input: "$username", regex: exactRegex } }, 100, 0] },

                            // Username starts with query → high priority
                            { $cond: [{ $regexMatch: { input: "$username", regex: prefixRegex } }, 60, 0] },

                            // Name starts with query → medium priority
                            { $cond: [{ $regexMatch: { input: "$firstName", regex: prefixRegex } }, 40, 0] },
                            { $cond: [{ $regexMatch: { input: "$lastName", regex: prefixRegex } }, 40, 0] },

                            // Contains anywhere → lower priority
                            { $cond: [{ $regexMatch: { input: "$username", regex: containsRegex } }, 20, 0] },
                            { $cond: [{ $regexMatch: { input: "$firstName", regex: containsRegex } }, 10, 0] },
                            { $cond: [{ $regexMatch: { input: "$lastName", regex: containsRegex } }, 10, 0] },

                            // Optional popularity boost: more followers → slightly higher score
                            { $cond: [{ $gt: ["$followersCount", 1000] }, 15, 0] }
                        ]
                    }
                }
            },

            // 2 Only keep users with score > 0
            { $match: { score: { $gt: 0 } } },

            // 3️ Remove sensitive fields
            { $project: { password: 0, __v: 0 } },

            // 4️ Sort by score descending, then followers descending
            { $sort: { score: -1, followersCount: -1 } },

            // 5️ Limit results for UX / performance
            { $limit: 20 }
        ]);
    },

    /**
     * Gets suggested users that the current user is NOT already following.
     * @param {string} userId - 
     * @param {number} limit - 
     */
    getSuggestedUsers: async (userId, limit = 5) => {
        // 1. Find all 'following' IDs for the current user from the Follow collection
        const followedRelations = await Follow.find({ follower: userId }).select('following');

        // 2. Extract just the IDs into a simple array
        const followedIds = followedRelations.map(rel => rel.following);

        // 3. Add the current user's own ID to the exclusion list (don't suggest yourself)
        followedIds.push(userId);

        // 4. Find users who are NOT in the followedIds list
        const suggestedUsers = await User.find({
            _id: { $nin: followedIds }
        })
            .limit(limit)
            .select('username firstName lastName bio avatar stats'); // Select only needed fields

        return suggestedUsers;
    },

    /**
 * Toggles the follow status between two users.
 * @param {string} followerId - The ID of the user performing the action.
 * @param {string} targetId - The ID of the user being followed/unfollowed.
 */
    toggleFollow: async (followerId, targetId) => {
        if (followerId === targetId) {
            throw new Error("You cannot follow yourself.");
        }

        // 1. Check if the relationship already exists
        const existingFollow = await Follow.findOne({
            follower: followerId,
            following: targetId
        });

        if (existingFollow) {
            // 2. UNFOLLOW: Remove the record
            await Follow.deleteOne({ _id: existingFollow._id });

            // Update counts in the User model (Atomic decrement)
            await User.findByIdAndUpdate(followerId, { $inc: { 'stats.followingCount': -1 } });
            await User.findByIdAndUpdate(targetId, { $inc: { 'stats.followerCount': -1 } });

            return { followed: false, message: "Unfollowed successfully" };
        } else {
            // 3. FOLLOW: Create new record
            const newFollow = new Follow({
                follower: followerId,
                following: targetId
            });
            await newFollow.save();

            // Update counts in the User model (Atomic increment)
            await User.findByIdAndUpdate(followerId, { $inc: { 'stats.followingCount': 1 } });
            await User.findByIdAndUpdate(targetId, { $inc: { 'stats.followerCount': 1 } });

            return { followed: true, message: "Followed successfully" };
        }
    },
};

module.exports = userService;

const { get } = require('http');
const User = require('../models/user.model');
const Follow = require('../models/follow.model');
const Quote = require('../models/quote.model');
const cloudinaryService = require('./cloudinary.service');
const fs = require('fs/promises');

const userService = {
    getUserByUsername: async (username, requesterId = null) => {
        const user = await User.findOne({ username: username }).select('-password');
        return user;
    },

    /**
     * @param {String} userId - The ID of the user to update
     * @param {Object} updateData - An object containing the fields to update
     * @returns {Object|null} - The updated user object or null if not found
     */
    updateUserProfile: async (userId, updateData) => {
        // 1. Define strictly which fields a user is allowed to change
        const allowedUpdates = [
            'firstName',
            'lastName',
            'bio',
            'avatarUrl'
        ];

        // 2. Filter the incoming data (Sanitization)
        const filteredData = {};
        Object.keys(updateData).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                filteredData[key] = updateData[key];
            }
        });

        // 3. Optional: Handle nested or complex logic 
        // Example: If username can be changed, you might need a uniqueness check first
        if (updateData.username) {
            const existing = await User.findOne({ username: updateData.username });
            if (existing && existing._id.toString() !== userId) {
                throw new Error("Username already taken");
            }
            filteredData.username = updateData.username;
        }

        // 4. Perform the update
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: filteredData },
            {
                new: true,           // Return the modified document rather than the original
                runValidators: true, // Ensure the new data matches Schema requirements
                select: '-password'  // Double security: never return the hashed password
            }
        ).lean();

        if (!updatedUser) {
            throw new Error("User not found");
        }

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

    searchUsers: async ({ query, cursor = null, limit = 20 }) => {

        const escaped = query.replace(/[*+?^${}()|[\]\\]/g, '\\$&');

        const exactRegex = new RegExp(`^${escaped}$`, 'i');
        const prefixRegex = new RegExp(`^${escaped}`, 'i');
        const containsRegex = new RegExp(escaped, 'i');

        const pipeline = [
            {
                $addFields: {
                    score: {
                        $add: [
                            { $cond: [{ $regexMatch: { input: "$username", regex: exactRegex } }, 100, 0] },
                            { $cond: [{ $regexMatch: { input: "$username", regex: prefixRegex } }, 60, 0] },
                            { $cond: [{ $regexMatch: { input: "$firstName", regex: prefixRegex } }, 40, 0] },
                            { $cond: [{ $regexMatch: { input: "$lastName", regex: prefixRegex } }, 40, 0] },
                            { $cond: [{ $regexMatch: { input: "$username", regex: containsRegex } }, 20, 0] },
                            { $cond: [{ $regexMatch: { input: "$firstName", regex: containsRegex } }, 10, 0] },
                            { $cond: [{ $regexMatch: { input: "$lastName", regex: containsRegex } }, 10, 0] },
                            { $cond: [{ $gt: ["$followersCount", 1000] }, 15, 0] }
                        ]
                    }
                }
            },

            { $match: { score: { $gt: 0 } } }
        ];

        // Cursor filter (keyset pagination)
        if (cursor) {
            const { score, id } = cursor;
            pipeline.push({
                $match: {
                    $or: [
                        { score: { $lt: score } },
                        { score: score, _id: { $gt: new mongoose.Types.ObjectId(id) } }
                    ]
                }
            });
        }

        pipeline.push(
            { $sort: { score: -1, _id: 1 } },
            { $limit: limit + 1 },
            { $project: { password: 0, __v: 0 } }
        );

        const users = await User.aggregate(pipeline);

        const hasMore = users.length > limit;
        if (hasMore) users.pop();

        return {
            users,
            pagination: {
                nextCursor: hasMore
                    ? {
                        score: users[users.length - 1].score,
                        id: users[users.length - 1]._id
                    }
                    : null,
                hasMore
            }
        };
    },

    /**
     * Gets suggested users that the current user is NOT already following.
     * @param {string} userId - 
     * @param {number} limit - 
     */
    getSuggestedUsers: async ({ userId = null, limit = 8 }) => {

        // PUBLIC USERS (not logged in)
        if (!userId) {
            return await User.find({})
                .sort({ followersCount: -1, lastActiveAt: -1 })
                .limit(limit)
                .select('username firstName lastName avatarUrl bio stats isBanned');
        }

        // Get users current user follows
        const followed = await Follow.find({ follower: userId })
            .select('following')
            .lean();

        const followedIds = followed.map(f => f.following);

        // Aggregate suggestion candidates
        const suggestions = await Follow.aggregate([
            // Find users followed by people I follow
            {
                $match: {
                    follower: { $in: followedIds }
                }
            },
            // Count mutual connections
            {
                $group: {
                    _id: '$following',
                    mutualCount: { $sum: 1 }
                }
            },
            // Exclude already-followed & self
            {
                $match: {
                    _id: { $nin: [...followedIds, userId] }
                }
            },
            // Rank by mutual followers
            { $sort: { mutualCount: -1 } },
            { $limit: limit },
            // Join user data
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: '$user._id',
                    username: '$user.username',
                    firstName: '$user.firstName',
                    lastName: '$user.lastName',
                    avatar: '$user.avatar',
                    mutualCount: 1
                }
            }
        ]);

        return suggestions;
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

    getUserRequotes: async ({ userId, cursor = null, limit = 20 }) => {
        const query = {
            creator: userId,
            isRequote: true,
            isHiddenBySystem: false,
        };

        // Cursor-based pagination using _id
        if (cursor) {
            query._id = { $lt: cursor };
        }

        // Fetch one extra to determine "hasMore"
        const quotes = await Quote.find(query)
            .sort({ _id: -1 }) // newest first
            .limit(limit + 1)
            .lean();

        const hasMore = quotes.length > limit;
        if (hasMore) quotes.pop();

        return {
            quotes,
            pagination: {
                nextCursor: hasMore ? quotes[quotes.length - 1]._id : null,
                hasMore,
                pageSize: limit,
            },
        };
    },

    getFollowers: async ({ userId, currentUserId, cursor = null, limit = 20 }) => {
        const query = { following: userId };
        if (cursor) query._id = { $lt: cursor };

        // 1. Fetch Follow documents
        const follows = await Follow.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate('follower', 'username firstName lastName avatarUrl bio stats')
            .lean();

        const hasMore = follows.length > limit;
        if (hasMore) follows.pop();

        const followerList = follows.map(f => f.follower);
        const followerIds = followerList.map(f => f._id);

        // 2. SOCIAL GRAPH CHECK (Scale optimization)
        // Check if the LOGGED-IN user follows these people (to show 'Following' vs 'Follow' button)
        let followingStatus = [];
        if (currentUserId) {
            followingStatus = await Follow.find({
                follower: currentUserId,
                following: { $in: followerIds }
            }).select('following').lean();
        }

        const followingSet = new Set(followingStatus.map(f => f.following.toString()));

        return {
            users: followerList.map(user => ({
                ...user,
                isFollowing: followingSet.has(user._id.toString()) // Critical for UI
            })),
            pagination: {
                nextCursor: hasMore ? follows[follows.length - 1]._id : null,
                hasMore
            }
        };
    },

    getFollowing: async ({ userId, currentUserId, cursor = null, limit = 20 }) => {
        const query = { follower: userId };
        if (cursor) query._id = { $lt: cursor };

        // 1. Fetch Follow documents with indexed sorting
        const follows = await Follow.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate('following', 'username firstName lastName avatarUrl bio stats')
            .lean();

        const hasMore = follows.length > limit;
        if (hasMore) follows.pop();

        const followingList = follows.map(f => f.following);
        const followingIds = followingList.map(f => f._id);

        // 2. SOCIAL GRAPH CHECK: "Do they follow me back?"
        // On Twitter/Insta, this displays the "Follows You" badge
        let followedByStatus = [];
        if (currentUserId) {
            followedByStatus = await Follow.find({
                follower: { $in: followingIds },
                following: currentUserId
            }).select('follower').lean();
        }

        const followedBySet = new Set(followedByStatus.map(f => f.follower.toString()));

        return {
            following: followingList.map(user => ({
                ...user,
                followsYou: followedBySet.has(user._id.toString()) // The "Follows You" badge logic
            })),
            pagination: {
                nextCursor: hasMore ? follows[follows.length - 1]._id : null,
                hasMore,
                pageSize: limit
            },
        };
    },
};

module.exports = userService;

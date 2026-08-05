"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const config_1 = require("@nestjs/config");
const fs_1 = require("fs");
const user_model_1 = __importDefault(require("../../models/user.model"));
const follow_model_1 = __importDefault(require("../../models/follow.model"));
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const cursor_util_1 = require("../../shared/utils/cursor.util");
const user_cache_1 = require("../../infrastructure/cache/user.cache");
const cache_invalidation_service_1 = require("../../infrastructure/cache/cache-invalidation.service");
let UsersService = class UsersService {
    constructor(userModel, followModel, quoteModel, configService, cloudinaryService, userCache, cacheInvalidation) {
        this.userModel = userModel;
        this.followModel = followModel;
        this.quoteModel = quoteModel;
        this.configService = configService;
        this.cloudinaryService = cloudinaryService;
        this.userCache = userCache;
        this.cacheInvalidation = cacheInvalidation;
    }
    get NOTIFICATIONS_ENABLED() {
        return this.configService.get("NOTIFICATIONS_ENABLED") === "true";
    }
    async getUserByUsername(username, currentUserId) {
        const user = await this.userModel.findOne({ username }).select("-password");
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        await this.userCache.warmUpUserCache(user._id.toString(), { profile: user });
        return user;
    }
    async updateUserProfile(userId, updateData) {
        const allowedUpdates = ["firstName", "lastName", "bio", "avatarUrl"];
        const filteredData = {};
        Object.keys(updateData).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                filteredData[key] = updateData[key];
            }
        });
        if (updateData.username) {
            const existing = await this.userModel.findOne({
                username: updateData.username,
            });
            if (existing && existing._id.toString() !== userId) {
                throw new common_1.ConflictException("Username already taken");
            }
            filteredData.username = updateData.username;
        }
        const updatedUser = await this.userModel
            .findByIdAndUpdate(userId, { $set: filteredData }, {
            new: true,
            runValidators: true,
            select: "-password",
        })
            .lean();
        if (!updatedUser) {
            throw new common_1.NotFoundException("User not found");
        }
        this.cacheInvalidation.emitUserUpdated(userId);
        return updatedUser;
    }
    async updateUserAvatar(userId, avatarFile) {
        let newAvatarUrl;
        const filePath = avatarFile.path;
        const user = await this.userModel.findById(userId).select("avatarUrl");
        if (!user) {
            throw new common_1.NotFoundException("User not found.");
        }
        try {
            newAvatarUrl = await this.cloudinaryService.uploadImage(filePath);
            if (user.avatarUrl) {
                const oldPublicId = this.cloudinaryService.getPublicIdFromUrl(user.avatarUrl);
                if (oldPublicId) {
                    await this.cloudinaryService.deleteImage(oldPublicId);
                }
            }
            const updatedUser = await this.userModel.findByIdAndUpdate(userId, { $set: { avatarUrl: newAvatarUrl } }, { new: true, select: "-password" });
            await fs_1.promises.unlink(filePath);
            this.cacheInvalidation.emitUserUpdated(userId);
            return updatedUser;
        }
        catch (error) {
            if (filePath) {
                await fs_1.promises
                    .unlink(filePath)
                    .catch((err) => console.error("Cleanup error:", err));
            }
            throw error;
        }
    }
    async getSuggestedUsers({ userId = null, limit = 8, }) {
        if (!userId) {
            return await this.userModel
                .find({})
                .sort({ "stats.followerCount": -1, createdAt: -1 })
                .limit(limit)
                .select("username firstName lastName avatarUrl bio stats isBanned");
        }
        return await this.userCache.getSuggestedUsers(userId, async () => {
            const followed = await this.followModel
                .find({ follower: userId })
                .select("following")
                .lean();
            const followedIds = followed.map((f) => f.following);
            const suggestions = await this.followModel.aggregate([
                {
                    $match: {
                        follower: { $in: followedIds },
                    },
                },
                {
                    $group: {
                        _id: "$following",
                        mutualCount: { $sum: 1 },
                    },
                },
                {
                    $match: {
                        _id: { $nin: [...followedIds, userId] },
                    },
                },
                { $sort: { mutualCount: -1 } },
                { $limit: limit },
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "user",
                    },
                },
                { $unwind: "$user" },
                {
                    $project: {
                        _id: "$user._id",
                        username: "$user.username",
                        firstName: "$user.firstName",
                        lastName: "$user.lastName",
                        avatar: "$user.avatarUrl",
                        mutualCount: 1,
                    },
                },
            ]);
            return suggestions;
        });
    }
    async toggleFollow(followerId, targetId) {
        if (followerId === targetId) {
            throw new common_1.BadRequestException("You cannot follow yourself.");
        }
        const existingFollow = await this.followModel.findOne({
            follower: followerId,
            following: targetId,
        });
        if (existingFollow) {
            await this.followModel.deleteOne({ _id: existingFollow._id });
            await this.userModel.findByIdAndUpdate(followerId, {
                $inc: { "stats.followingCount": -1 },
            });
            await this.userModel.findByIdAndUpdate(targetId, {
                $inc: { "stats.followerCount": -1 },
            });
            this.cacheInvalidation.emitFollowToggled(followerId, targetId);
            return { followed: false, message: "Unfollowed successfully" };
        }
        else {
            const newFollow = new this.followModel({
                follower: followerId,
                following: targetId,
            });
            await newFollow.save();
            await this.userModel.findByIdAndUpdate(followerId, {
                $inc: { "stats.followingCount": 1 },
            });
            await this.userModel.findByIdAndUpdate(targetId, {
                $inc: { "stats.followerCount": 1 },
            });
            this.cacheInvalidation.emitFollowToggled(followerId, targetId);
            if (this.NOTIFICATIONS_ENABLED) {
                process.nextTick(() => {
                    console.log("Notification queued for follow");
                });
            }
            return { followed: true, message: "Followed successfully" };
        }
    }
    async getUserRequotes({ userId, cursor = null, limit = 20, }) {
        const query = {
            creator: userId,
            isRequote: true,
            isHiddenBySystem: false,
        };
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, "_id", -1));
        }
        const quotes = await this.quoteModel
            .find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, [
            "_id",
        ]);
        return {
            quotes: data,
            pagination,
        };
    }
    async getFollowers({ userId, currentUserId, cursor = null, limit = 20, }) {
        const query = { following: userId };
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, "_id", -1));
        }
        const follows = await this.followModel
            .find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate("follower", "username firstName lastName avatarUrl bio stats")
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(follows, limit, [
            "_id",
        ]);
        const followerList = data.map((f) => f.follower);
        const followerIds = followerList.map((f) => f._id);
        let followingStatus = [];
        if (currentUserId) {
            followingStatus = await this.followModel
                .find({
                follower: currentUserId,
                following: { $in: followerIds },
            })
                .select("following")
                .lean();
        }
        const followingSet = new Set(followingStatus.map((f) => f.following.toString()));
        return {
            users: followerList.map((user) => ({
                ...user,
                isFollowing: followingSet.has(user._id.toString()),
            })),
            pagination,
        };
    }
    async getFollowing({ userId, currentUserId, cursor = null, limit = 20, }) {
        const query = { follower: userId };
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, "_id", -1));
        }
        const follows = await this.followModel
            .find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate("following", "username firstName lastName avatarUrl bio stats")
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(follows, limit, [
            "_id",
        ]);
        const followingList = data.map((f) => f.following);
        const followingIds = followingList.map((f) => f._id);
        let followedByStatus = [];
        if (currentUserId) {
            followedByStatus = await this.followModel
                .find({
                follower: { $in: followingIds },
                following: currentUserId,
            })
                .select("follower")
                .lean();
        }
        const followedBySet = new Set(followedByStatus.map((f) => f.follower.toString()));
        return {
            following: followingList.map((user) => ({
                ...user,
                followsYou: followedBySet.has(user._id.toString()),
            })),
            pagination,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_model_1.default.name)),
    __param(1, (0, mongoose_1.InjectModel)(follow_model_1.default.name)),
    __param(2, (0, mongoose_1.InjectModel)(quote_model_1.default.name)),
    __param(4, (0, common_1.Inject)("CLOUDINARY_SERVICE")),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        config_1.ConfigService, Object, user_cache_1.UserCacheService,
        cache_invalidation_service_1.CacheInvalidationService])
], UsersService);
//# sourceMappingURL=users.service.js.map
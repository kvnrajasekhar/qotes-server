"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = __importDefault(require("../../models/user.model"));
const follow_model_1 = __importDefault(require("../../models/follow.model"));
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const quoteNotifications_queue_1 = require("../../shared/queues/quoteNotifications.queue");
const cloudinary_service_1 = __importDefault(
  require("../../infrastructure/media/cloudinary.service"),
);
const fs_1 = require("fs");
const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === "true";
const getUserByUsername = async (username) => {
  const user = await user_model_1.default
    .findOne({ username: username })
    .select("-password");
  return user;
};
const updateUserProfile = async (userId, updateData) => {
  const allowedUpdates = ["firstName", "lastName", "bio", "avatarUrl"];
  const filteredData = {};
  Object.keys(updateData).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      filteredData[key] = updateData[key];
    }
  });
  if (updateData.username) {
    const existing = await user_model_1.default.findOne({
      username: updateData.username,
    });
    if (existing && existing._id.toString() !== userId) {
      throw new Error("Username already taken");
    }
    filteredData.username = updateData.username;
  }
  const updatedUser = await user_model_1.default
    .findByIdAndUpdate(
      userId,
      { $set: filteredData },
      {
        new: true,
        runValidators: true,
        select: "-password",
      },
    )
    .lean();
  if (!updatedUser) {
    throw new Error("User not found");
  }
  return updatedUser;
};
const updateUserAvatar = async (userId, avatarFile) => {
  let newAvatarUrl;
  const filePath = avatarFile.path;
  const user = await user_model_1.default.findById(userId).select("avatar");
  if (!user) {
    throw new Error("User not found.");
  }
  try {
    newAvatarUrl = await cloudinary_service_1.default.uploadImage(filePath);
    if (user.avatar) {
      const oldPublicId = cloudinary_service_1.default.getPublicIdFromUrl(
        user.avatar,
      );
      if (oldPublicId) {
        await cloudinary_service_1.default.deleteImage(oldPublicId);
      }
    }
    const updatedUser = await user_model_1.default.findByIdAndUpdate(
      userId,
      { $set: { avatar: newAvatarUrl } },
      { new: true, select: "-password" },
    );
    await fs_1.promises.unlink(filePath);
    return updatedUser;
  } catch (error) {
    if (filePath) {
      await fs_1.promises
        .unlink(filePath)
        .catch((err) => console.error("Cleanup error:", err));
    }
    throw error;
  }
};
const getSuggestedUsers = async ({ userId = null, limit = 8 }) => {
  if (!userId) {
    return await user_model_1.default
      .find({})
      .sort({ followersCount: -1, lastActiveAt: -1 })
      .limit(limit)
      .select("username firstName lastName avatarUrl bio stats isBanned");
  }
  const followed = await follow_model_1.default
    .find({ follower: userId })
    .select("following")
    .lean();
  const followedIds = followed.map((f) => f.following);
  const suggestions = await follow_model_1.default.aggregate([
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
        avatar: "$user.avatar",
        mutualCount: 1,
      },
    },
  ]);
  return suggestions;
};
const toggleFollow = async (followerId, targetId) => {
  if (followerId === targetId) {
    throw new Error("You cannot follow yourself.");
  }
  const existingFollow = await follow_model_1.default.findOne({
    follower: followerId,
    following: targetId,
  });
  if (existingFollow) {
    await follow_model_1.default.deleteOne({ _id: existingFollow._id });
    await user_model_1.default.findByIdAndUpdate(followerId, {
      $inc: { "stats.followingCount": -1 },
    });
    await user_model_1.default.findByIdAndUpdate(targetId, {
      $inc: { "stats.followerCount": -1 },
    });
    return { followed: false, message: "Unfollowed successfully" };
  } else {
    const newFollow = new follow_model_1.default({
      follower: followerId,
      following: targetId,
    });
    await newFollow.save();
    await user_model_1.default.findByIdAndUpdate(followerId, {
      $inc: { "stats.followingCount": 1 },
    });
    await user_model_1.default.findByIdAndUpdate(targetId, {
      $inc: { "stats.followerCount": 1 },
    });
    if (NOTIFICATIONS_ENABLED) {
      process.nextTick(() => {
        (0, quoteNotifications_queue_1.enqueueNotificationJob)({
          type: "user-follow",
          recipientId: targetId,
          actorId: followerId,
          subject: "New follower on Qotes",
        }).catch((err) => {
          console.error("Failed to enqueue follow notification job:", err);
        });
      });
    }
    return { followed: true, message: "Followed successfully" };
  }
};
const getUserRequotes = async ({ userId, cursor = null, limit = 20 }) => {
  const query = {
    creator: userId,
    isRequote: true,
    isHiddenBySystem: false,
  };
  if (cursor) {
    query._id = { $lt: cursor };
  }
  const quotes = await quote_model_1.default
    .find(query)
    .sort({ _id: -1 })
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
};
const getFollowers = async ({
  userId,
  currentUserId,
  cursor = null,
  limit = 20,
}) => {
  const query = { following: userId };
  if (cursor) query._id = { $lt: cursor };
  const follows = await follow_model_1.default
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate("follower", "username firstName lastName avatarUrl bio stats")
    .lean();
  const hasMore = follows.length > limit;
  if (hasMore) follows.pop();
  const followerList = follows.map((f) => f.follower);
  const followerIds = followerList.map((f) => f._id);
  let followingStatus = [];
  if (currentUserId) {
    followingStatus = await follow_model_1.default
      .find({
        follower: currentUserId,
        following: { $in: followerIds },
      })
      .select("following")
      .lean();
  }
  const followingSet = new Set(
    followingStatus.map((f) => f.following.toString()),
  );
  return {
    users: followerList.map((user) => ({
      ...user,
      isFollowing: followingSet.has(user._id.toString()),
    })),
    pagination: {
      nextCursor: hasMore ? follows[follows.length - 1]._id : null,
      hasMore,
    },
  };
};
const getFollowing = async ({
  userId,
  currentUserId,
  cursor = null,
  limit = 20,
}) => {
  const query = { follower: userId };
  if (cursor) query._id = { $lt: cursor };
  const follows = await follow_model_1.default
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate("following", "username firstName lastName avatarUrl bio stats")
    .lean();
  const hasMore = follows.length > limit;
  if (hasMore) follows.pop();
  const followingList = follows.map((f) => f.following);
  const followingIds = followingList.map((f) => f._id);
  let followedByStatus = [];
  if (currentUserId) {
    followedByStatus = await follow_model_1.default
      .find({
        follower: { $in: followingIds },
        following: currentUserId,
      })
      .select("follower")
      .lean();
  }
  const followedBySet = new Set(
    followedByStatus.map((f) => f.follower.toString()),
  );
  return {
    following: followingList.map((user) => ({
      ...user,
      followsYou: followedBySet.has(user._id.toString()),
    })),
    pagination: {
      nextCursor: hasMore ? follows[follows.length - 1]._id : null,
      hasMore,
      pageSize: limit,
    },
  };
};
const userService = {
  getUserByUsername,
  updateUserProfile,
  updateUserAvatar,
  getSuggestedUsers,
  toggleFollow,
  getUserRequotes,
  getFollowers,
  getFollowing,
};
exports.default = userService;
//# sourceMappingURL=user.service.js.map

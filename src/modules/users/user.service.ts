import User from '../../models/user.model';
import Follow from '../../models/follow.model';
import Quote from '../../models/quote.model';
import { enqueueNotificationJob } from '../../shared/queues/quoteNotifications.queue';
import cloudinaryService from '../../infrastructure/media/cloudinary.service';
import { promises as fs } from 'fs';
import { buildCursorQuery, processPaginatedResults } from '../../shared/utils/cursor.util';

interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  username?: string;
}

interface AvatarFile {
  path: string;
}

const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === 'true';

const getUserByUsername = async (username: string) => {
  const user = await User.findOne({ username: username }).select('-password');
  return user;
};

const updateUserProfile = async (userId: string, updateData: UpdateProfileData) => {
  const allowedUpdates = ['firstName', 'lastName', 'bio', 'avatarUrl'];

  const filteredData: Partial<UpdateProfileData> = {};
  Object.keys(updateData).forEach(key => {
    if (allowedUpdates.includes(key)) {
      filteredData[key as keyof UpdateProfileData] = updateData[key as keyof UpdateProfileData];
    }
  });

  if (updateData.username) {
    const existing = await User.findOne({ username: updateData.username });
    if (existing && existing._id.toString() !== userId) {
      throw new Error('Username already taken');
    }
    filteredData.username = updateData.username;
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: filteredData },
    {
      new: true,
      runValidators: true,
      select: '-password',
    }
  ).lean();

  if (!updatedUser) {
    throw new Error('User not found');
  }

  return updatedUser;
};

const updateUserAvatar = async (userId: string, avatarFile: AvatarFile) => {
  let newAvatarUrl: string;
  const filePath = avatarFile.path;

  const user = (await User.findById(userId).select('avatar')) as any;
  if (!user) {
    throw new Error('User not found.');
  }

  try {
    newAvatarUrl = await cloudinaryService.uploadImage(filePath);

    if (user.avatar) {
      const oldPublicId = cloudinaryService.getPublicIdFromUrl(user.avatar);

      if (oldPublicId) {
        await cloudinaryService.deleteImage(oldPublicId);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { avatar: newAvatarUrl } },
      { new: true, select: '-password' }
    );

    await fs.unlink(filePath);

    return updatedUser;
  } catch (error: unknown) {
    if (filePath) {
      await fs.unlink(filePath).catch(err => console.error('Cleanup error:', err));
    }
    throw error;
  }
};

const getSuggestedUsers = async ({
  userId = null,
  limit = 8,
}: {
  userId?: string | null;
  limit?: number;
}) => {
  if (!userId) {
    return await User.find({})
      .sort({ followersCount: -1, lastActiveAt: -1 })
      .limit(limit)
      .select('username firstName lastName avatarUrl bio stats isBanned');
  }

  const followed = await Follow.find({ follower: userId }).select('following').lean();

  const followedIds = followed.map(f => (f.following as any).toString());

  const suggestions = await Follow.aggregate([
    {
      $match: {
        follower: { $in: followedIds },
      },
    },
    {
      $group: {
        _id: '$following',
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
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: '$user._id',
        username: '$user.username',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        avatar: '$user.avatar',
        mutualCount: 1,
      },
    },
  ]);

  return suggestions;
};

const toggleFollow = async (followerId: string, targetId: string) => {
  if (followerId === targetId) {
    throw new Error('You cannot follow yourself.');
  }

  const existingFollow = await Follow.findOne({
    follower: followerId,
    following: targetId,
  });

  if (existingFollow) {
    await Follow.deleteOne({ _id: existingFollow._id });

    await User.findByIdAndUpdate(followerId, {
      $inc: { 'stats.followingCount': -1 },
    });
    await User.findByIdAndUpdate(targetId, {
      $inc: { 'stats.followerCount': -1 },
    });

    return { followed: false, message: 'Unfollowed successfully' };
  } else {
    const newFollow = new Follow({
      follower: followerId,
      following: targetId,
    });
    await newFollow.save();

    await User.findByIdAndUpdate(followerId, {
      $inc: { 'stats.followingCount': 1 },
    });
    await User.findByIdAndUpdate(targetId, {
      $inc: { 'stats.followerCount': 1 },
    });

    if (NOTIFICATIONS_ENABLED) {
      void process.nextTick(() => {
        enqueueNotificationJob({
          type: 'user-follow',
          recipientId: targetId,
          actorId: followerId,
          subject: 'New follower on Qotes',
        }).catch((err: unknown) => {
          console.error('Failed to enqueue follow notification job:', err);
        });
      });
    }

    return { followed: true, message: 'Followed successfully' };
  }
};

const getUserRequotes = async ({
  userId,
  cursor = null,
  limit = 20,
}: {
  userId: string;
  cursor?: string | null;
  limit?: number;
}) => {
  const query: Record<string, unknown> = {
    creator: userId,
    isRequote: true,
    isHiddenBySystem: false,
  };

  if (cursor) {
    Object.assign(query, buildCursorQuery(cursor, '_id', -1));
  }

  const quotes = await Quote.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const { data, pagination } = processPaginatedResults(quotes, limit, ['_id']);

  return {
    quotes: data,
    pagination,
  };
};

const getFollowers = async ({
  userId,
  currentUserId,
  cursor = null,
  limit = 20,
}: {
  userId: string;
  currentUserId?: string;
  cursor?: string | null;
  limit?: number;
}) => {
  const query: Record<string, unknown> = { following: userId };
  if (cursor) {
    Object.assign(query, buildCursorQuery(cursor, '_id', -1));
  }

  const follows = await Follow.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate('follower', 'username firstName lastName avatarUrl bio stats')
    .lean();

  const { data, pagination } = processPaginatedResults(follows, limit, ['_id']);

  const followerList = data.map(f => f.follower as any);
  const followerIds = followerList.map(f => f._id.toString());

  let followingStatus = [];
  if (currentUserId) {
    followingStatus = await Follow.find({
      follower: currentUserId,
      following: { $in: followerIds },
    })
      .select('following')
      .lean();
  }

  const followingSet = new Set(followingStatus.map(f => (f.following as any).toString()));

  return {
    users: followerList.map(user => ({
      ...user,
      isFollowing: followingSet.has(user._id.toString()),
    })),
    pagination,
  };
};

const getFollowing = async ({
  userId,
  currentUserId,
  cursor = null,
  limit = 20,
}: {
  userId: string;
  currentUserId?: string;
  cursor?: string | null;
  limit?: number;
}) => {
  const query: Record<string, unknown> = { follower: userId };
  if (cursor) {
    Object.assign(query, buildCursorQuery(cursor, '_id', -1));
  }

  const follows = await Follow.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate('following', 'username firstName lastName avatarUrl bio stats')
    .lean();

  const { data, pagination } = processPaginatedResults(follows, limit, ['_id']);

  const followingList = data.map(f => f.following as any);
  const followingIds = followingList.map(f => f._id.toString());

  let followedByStatus = [];
  if (currentUserId) {
    followedByStatus = await Follow.find({
      follower: { $in: followingIds },
      following: currentUserId,
    })
      .select('follower')
      .lean();
  }

  const followedBySet = new Set(followedByStatus.map(f => (f.follower as any).toString()));

  return {
    following: followingList.map(user => ({
      ...user,
      followsYou: followedBySet.has(user._id.toString()),
    })),
    pagination,
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

export default userService;

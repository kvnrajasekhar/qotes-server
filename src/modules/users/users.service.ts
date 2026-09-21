import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';

import User, { IUser } from '../../models/user.model';
import Follow, { IFollow } from '../../models/follow.model';
import Quote, { IQuote } from '../../models/quote.model';
import { buildCursorQuery, processPaginatedResults } from '../../shared/utils/cursor.util';
import { CloudinaryService } from '../../infrastructure/media/cloudinary.service';
import { UserCacheService } from '../../infrastructure/cache/user.cache';
import { CacheInvalidationService } from '../../infrastructure/cache/cache-invalidation.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<IUser>,
    @InjectModel(Follow.name) private followModel: Model<IFollow>,
    @InjectModel(Quote.name) private quoteModel: Model<IQuote>,
    private configService: ConfigService,
    @Inject('CLOUDINARY_SERVICE') private cloudinaryService: CloudinaryService,
    private readonly userCache: UserCacheService,
    private readonly cacheInvalidation: CacheInvalidationService
  ) { }

  private get NOTIFICATIONS_ENABLED(): boolean {
    return this.configService.get('NOTIFICATIONS_ENABLED') === 'true';
  }

  async getUserByUsername(username: string, _currentUserId?: string) {
    const user = await this.userModel.findOne({ username }).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cache user profile
    await this.userCache.warmUpUserCache(user._id.toString(), { profile: user });

    return user;
  }

  async updateUserProfile(userId: string, updateData: Record<string, unknown>) {
    const allowedUpdates = ['firstName', 'lastName', 'bio', 'avatarUrl'];

    const filteredData: Record<string, unknown> = {};
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    if (updateData.username) {
      const existing = await this.userModel.findOne({
        username: updateData.username,
      });
      if (existing && existing._id.toString() !== userId) {
        throw new ConflictException('Username already taken');
      }
      filteredData.username = updateData.username;
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: filteredData },
        {
          new: true,
          runValidators: true,
          select: '-password',
        }
      )
      .lean();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    // Invalidate user cache after update
    this.cacheInvalidation.emitUserUpdated(userId);

    return updatedUser;
  }

  async updateUserAvatar(userId: string, avatarFile: Express.Multer.File) {
    let newAvatarUrl: string;
    const filePath = avatarFile.path;

    const user = await this.userModel.findById(userId).select('avatarUrl');
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    try {
      newAvatarUrl = await this.cloudinaryService.uploadImage(filePath);

      if (user.avatarUrl) {
        const oldPublicId = this.cloudinaryService.getPublicIdFromUrl(user.avatarUrl);

        if (oldPublicId) {
          await this.cloudinaryService.deleteImage(oldPublicId);
        }
      }

      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { $set: { avatarUrl: newAvatarUrl } },
        { new: true, select: '-password' }
      );

      await fs.unlink(filePath);

      // Invalidate user cache after avatar update
      this.cacheInvalidation.emitUserUpdated(userId);

      return updatedUser;
    } catch (error: unknown) {
      if (filePath) {
        await fs.unlink(filePath).catch(err => console.error('Cleanup error:', err));
      }
      if (error instanceof Error) {
        throw error;
      }
      throw Object.assign(
        new Error('An unexpected error occurred while updating user avatar'),
        { cause: error },
      );
    }
  }

  async getSuggestedUsers({
    userId = null,
    limit = 8,
  }: {
    userId?: string | null;
    limit?: number;
  }) {
    if (!userId) {
      return await this.userModel
        .find({})
        .sort({ 'stats.followerCount': -1, createdAt: -1 })
        .limit(limit)
        .select('username firstName lastName avatarUrl bio stats isBanned');
    }

    // Use cache for suggested users
    return await this.userCache.getSuggestedUsers(userId, async () => {
      const followed = await this.followModel.find({ follower: userId }).select('following').lean();

      const followedIds = followed.map(f => f.following);

      const suggestions = await this.followModel.aggregate([
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
            avatar: '$user.avatarUrl',
            mutualCount: 1,
          },
        },
      ]);

      return suggestions;
    });
  }

  async toggleFollow(followerId: string, targetId: string) {
    if (followerId === targetId) {
      throw new BadRequestException('You cannot follow yourself.');
    }

    const existingFollow = await this.followModel.findOne({
      follower: followerId,
      following: targetId,
    });

    if (existingFollow) {
      await this.followModel.deleteOne({ _id: existingFollow._id });

      await this.userModel.findByIdAndUpdate(followerId, {
        $inc: { 'stats.followingCount': -1 },
      });
      await this.userModel.findByIdAndUpdate(targetId, {
        $inc: { 'stats.followerCount': -1 },
      });

      // Invalidate cache for both users
      this.cacheInvalidation.emitFollowToggled(followerId, targetId);

      return { followed: false, message: 'Unfollowed successfully' };
    } else {
      const newFollow = new this.followModel({
        follower: followerId,
        following: targetId,
      });
      await newFollow.save();

      await this.userModel.findByIdAndUpdate(followerId, {
        $inc: { 'stats.followingCount': 1 },
      });
      await this.userModel.findByIdAndUpdate(targetId, {
        $inc: { 'stats.followerCount': 1 },
      });

      // Invalidate cache for both users
      this.cacheInvalidation.emitFollowToggled(followerId, targetId);

      if (this.NOTIFICATIONS_ENABLED) {
        // Queue notification job would go here
        process.nextTick(() => {
          console.log('Notification queued for follow');
        });
      }

      return { followed: true, message: 'Followed successfully' };
    }
  }

  async getUserRequotes({
    userId,
    cursor = null,
    limit = 20,
  }: {
    userId: string;
    cursor?: string | null;
    limit?: number;
  }) {
    const query: FilterQuery<IQuote> = {
      creator: userId,
      isRequote: true,
      isHiddenBySystem: false,
    };

    if (cursor) {
      Object.assign(query, buildCursorQuery(cursor, '_id', -1));
    }

    const quotes = await this.quoteModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const { data, pagination } = processPaginatedResults(quotes, limit, ['_id']);

    return {
      quotes: data,
      pagination,
    };
  }

  async getFollowers({
    userId,
    currentUserId,
    cursor = null,
    limit = 20,
  }: {
    userId: string;
    currentUserId?: string;
    cursor?: string | null;
    limit?: number;
  }) {
    const query: FilterQuery<IFollow> = { following: userId };
    if (cursor) {
      Object.assign(query, buildCursorQuery(cursor, '_id', -1));
    }

    const follows = await this.followModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('follower', 'username firstName lastName avatarUrl bio stats')
      .lean();

    const { data, pagination } = processPaginatedResults(follows, limit, ['_id']);

    const followerList = data.map((follow) => follow.follower as unknown as IUser);
    const followerIds = followerList.map((follower) => String(follower._id));

    const followingStatus = currentUserId
      ? await this.followModel
        .find({
          follower: currentUserId,
          following: { $in: followerIds },
        })
        .select('following')
        .lean()
      : [];

    const followingSet = new Set(followingStatus.map((follow) => String(follow.following)));

    return {
      users: followerList.map(user => ({
        ...user.toObject?.(),
        isFollowing: followingSet.has(user._id.toString()),
      })),
      pagination,
    };
  }

  async getFollowing({
    userId,
    currentUserId,
    cursor = null,
    limit = 20,
  }: {
    userId: string;
    currentUserId?: string;
    cursor?: string | null;
    limit?: number;
  }) {
    const query: FilterQuery<IFollow> = { follower: userId };
    if (cursor) {
      Object.assign(query, buildCursorQuery(cursor, '_id', -1));
    }

    const follows = await this.followModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('following', 'username firstName lastName avatarUrl bio stats')
      .lean();

    const { data, pagination } = processPaginatedResults(follows, limit, ['_id']);

    const followingList = data.map((follow) => follow.following as unknown as IUser);
    const followingIds = followingList.map((following) => String(following._id));

    const followedByStatus = currentUserId
      ? await this.followModel
        .find({
          follower: { $in: followingIds },
          following: currentUserId,
        })
        .select('follower')
        .lean()
      : [];

    const followedBySet = new Set(followedByStatus.map((follow) => String(follow.follower)));

    return {
      following: followingList.map(user => ({
        ...user.toObject?.(),
        followsYou: followedBySet.has(user._id.toString()),
      })),
      pagination,
    };
  }
}

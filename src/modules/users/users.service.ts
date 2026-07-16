import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { promises as fs } from "fs";

import User, { IUser } from "../../models/user.model";
import Follow, { IFollow } from "../../models/follow.model";
import Quote, { IQuote } from "../../models/quote.model";
import { Inject } from "@nestjs/common";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<IUser>,
    @InjectModel(Follow.name) private followModel: Model<IFollow>,
    @InjectModel(Quote.name) private quoteModel: Model<IQuote>,
    private configService: ConfigService,
    @Inject("CLOUDINARY_SERVICE") private cloudinaryService: any,
  ) {}

  private get NOTIFICATIONS_ENABLED(): boolean {
    return this.configService.get("NOTIFICATIONS_ENABLED") === "true";
  }

  async getUserByUsername(username: string, currentUserId?: string) {
    const user = await this.userModel.findOne({ username }).select("-password");
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async updateUserProfile(userId: string, updateData: any) {
    const allowedUpdates = ["firstName", "lastName", "bio", "avatarUrl"];

    const filteredData: any = {};
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
        throw new ConflictException("Username already taken");
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
          select: "-password",
        },
      )
      .lean();

    if (!updatedUser) {
      throw new NotFoundException("User not found");
    }

    return updatedUser;
  }

  async updateUserAvatar(userId: string, avatarFile: any) {
    let newAvatarUrl: string;
    const filePath = avatarFile.path;

    const user = await this.userModel.findById(userId).select("avatarUrl");
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    try {
      newAvatarUrl = await this.cloudinaryService.uploadImage(filePath);

      if (user.avatarUrl) {
        const oldPublicId = this.cloudinaryService.getPublicIdFromUrl(
          user.avatarUrl,
        );

        if (oldPublicId) {
          await this.cloudinaryService.deleteImage(oldPublicId);
        }
      }

      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { $set: { avatarUrl: newAvatarUrl } },
        { new: true, select: "-password" },
      );

      await fs.unlink(filePath);

      return updatedUser;
    } catch (error: any) {
      if (filePath) {
        await fs
          .unlink(filePath)
          .catch((err) => console.error("Cleanup error:", err));
      }
      throw error;
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
        .sort({ "stats.followerCount": -1, createdAt: -1 })
        .limit(limit)
        .select("username firstName lastName avatarUrl bio stats isBanned");
    }

    const followed = await this.followModel
      .find({ follower: userId })
      .select("following")
      .lean();

    const followedIds = followed.map((f: any) => f.following);

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
  }

  async toggleFollow(followerId: string, targetId: string) {
    if (followerId === targetId) {
      throw new BadRequestException("You cannot follow yourself.");
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

      return { followed: false, message: "Unfollowed successfully" };
    } else {
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

      if (this.NOTIFICATIONS_ENABLED) {
        // Queue notification job would go here
        process.nextTick(() => {
          console.log("Notification queued for follow");
        });
      }

      return { followed: true, message: "Followed successfully" };
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
    const query: any = {
      creator: userId,
      isRequote: true,
      isHiddenBySystem: false,
    };

    if (cursor) {
      query._id = { $lt: cursor };
    }

    const quotes = await this.quoteModel
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
    const query: any = { following: userId };
    if (cursor) query._id = { $lt: cursor };

    const follows = await this.followModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate("follower", "username firstName lastName avatarUrl bio stats")
      .lean();

    const hasMore = follows.length > limit;
    if (hasMore) follows.pop();

    const followerList = follows.map((f: any) => f.follower);
    const followerIds = followerList.map((f: any) => f._id);

    let followingStatus: any[] = [];
    if (currentUserId) {
      followingStatus = await this.followModel
        .find({
          follower: currentUserId,
          following: { $in: followerIds },
        })
        .select("following")
        .lean();
    }

    const followingSet = new Set(
      followingStatus.map((f: any) => f.following.toString()),
    );

    return {
      users: followerList.map((user: any) => ({
        ...user,
        isFollowing: followingSet.has(user._id.toString()),
      })),
      pagination: {
        nextCursor: hasMore ? follows[follows.length - 1]._id : null,
        hasMore,
      },
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
    const query: any = { follower: userId };
    if (cursor) query._id = { $lt: cursor };

    const follows = await this.followModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate("following", "username firstName lastName avatarUrl bio stats")
      .lean();

    const hasMore = follows.length > limit;
    if (hasMore) follows.pop();

    const followingList = follows.map((f: any) => f.following);
    const followingIds = followingList.map((f: any) => f._id);

    let followedByStatus: any[] = [];
    if (currentUserId) {
      followedByStatus = await this.followModel
        .find({
          follower: { $in: followingIds },
          following: currentUserId,
        })
        .select("follower")
        .lean();
    }

    const followedBySet = new Set(
      followedByStatus.map((f: any) => f.follower.toString()),
    );

    return {
      following: followingList.map((user: any) => ({
        ...user,
        followsYou: followedBySet.has(user._id.toString()),
      })),
      pagination: {
        nextCursor: hasMore ? follows[follows.length - 1]._id : null,
        hasMore,
        pageSize: limit,
      },
    };
  }
}

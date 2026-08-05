import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import Quote from '../../models/quote.model';
import Follow from '../../models/follow.model';
import Block from '../../models/block.model';
import UserContentPreference from '../../models/userContentPreference.model';
import {
  buildCursorQuery,
  buildCompoundCursorQuery,
  processPaginatedResults,
} from '../../shared/utils/cursor.util';
import { QuoteCacheService } from '../../infrastructure/cache/quote.cache';

@Injectable()
export class FeedsService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<any>,
    @InjectModel(Follow.name) private followModel: Model<any>,
    @InjectModel(Block.name) private blockModel: Model<any>,
    @InjectModel(UserContentPreference.name) private preferenceModel: Model<any>,
    private readonly quoteCache: QuoteCacheService,
  ) {}

  async getGlobalFeed({ userId, cursor = null, limit = 10 }: { userId?: string; cursor?: string | null; limit?: number }) {
    // Use cache for global feed (simple version without user-specific blocking for now)
    const page = this.extractPageFromCursor(cursor);
    
    return await this.quoteCache.getGlobalFeed(page, async () => {
      const query: any = { isHiddenBySystem: { $ne: true } };

      if (userId) {
        const blocks = await this.blockModel.find({
          $or: [{ blocker: userId }, { blocked: userId }],
        }).lean();

        const blockedUserIds = blocks.map((b) =>
          b.blocker.toString() === userId.toString() ? b.blocked : b.blocker,
        );

        const preferences = await this.preferenceModel.find({ userId }).lean();

        const excludedQuoteIds = preferences
          .filter((p) => p.type === 'QUOTE')
          .map((p) => p.targetId);
        const excludedAuthors = preferences
          .filter((p) => p.type === 'AUTHOR')
          .map((p) => p.targetId);
        const excludedTags = preferences
          .filter((p) => p.type === 'TAG')
          .map((p) => p.targetId);

        const finalExcludedAuthors = [
          ...new Set([...blockedUserIds, ...excludedAuthors]),
        ];

        query._id = { $nin: excludedQuoteIds };
        query.authorId = { $nin: finalExcludedAuthors };
        query.tags = { $nin: excludedTags };
      }

      if (cursor) {
        Object.assign(query, buildCursorQuery(cursor, 'createdAt', -1));
      }

      const quotes = await this.quoteModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean();

      const { data, pagination } = processPaginatedResults(quotes, limit, [
        'createdAt',
      ]);

      return {
        quotes: data,
        pagination,
      };
    });
  }

  private extractPageFromCursor(cursor: string | null): number {
    if (!cursor) return 1;
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
      return decoded.page || 1;
    } catch {
      return 1;
    }
  }

  async getUserQuotes({
    targetUserId,
    viewerId = null,
    cursor = null,
    limit = 10,
  }: {
    targetUserId: string;
    viewerId?: string | null;
    cursor?: string | null;
    limit?: number;
  }) {
    const query = {
      creator: targetUserId,
      isHiddenBySystem: { $ne: true },
    };

    if (viewerId) {
      const isBlocked = await this.blockModel.findOne({
        $or: [
          { blocker: viewerId, blocked: targetUserId },
          { blocker: targetUserId, blocked: viewerId },
        ],
      }).lean();

      if (isBlocked) {
        return {
          quotes: [],
          pagination: { nextCursor: null, hasMore: false },
          isBlocked: true,
        };
      }
    }

    if (cursor) {
      Object.assign(query, buildCursorQuery(cursor, 'createdAt', -1));
    }

    const quotes = await this.quoteModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const { data, pagination } = processPaginatedResults(quotes, limit, [
      'createdAt',
    ]);

    return {
      quotes: data,
      pagination,
    };
  }

  async getFollowingFeed({ userId, cursor = null, limit = 10 }: { userId: string; cursor?: string | null; limit?: number }) {
    const follows = await this.followModel.find({ follower: userId })
      .select('following')
      .lean();

    let followedUserIds = follows.map((f) => f.following);

    if (!followedUserIds.length) {
      return { quotes: [], pagination: { nextCursor: null, hasMore: false } };
    }

    const blocks = await this.blockModel.find({
      $or: [{ blocker: userId }, { blocked: userId }],
    }).lean();

    const blockedIds = blocks.map((b) =>
      b.blocker.toString() === userId.toString()
        ? b.blocked.toString()
        : b.blocker.toString(),
    );

    followedUserIds = followedUserIds.filter(
      (id) => !blockedIds.includes(id.toString()),
    );

    const preferences = await this.preferenceModel.find({ userId }).lean();

    const excludedQuoteIds = preferences
      .filter((p) => p.type === 'QUOTE')
      .map((p) => p.targetId);
    const excludedTags = preferences
      .filter((p) => p.type === 'TAG')
      .map((p) => p.targetId);

    const query = {
      author: { $in: followedUserIds },
      _id: { $nin: excludedQuoteIds },
      tags: { $nin: excludedTags },
      isHiddenBySystem: { $ne: true },
    };

    if (cursor) {
      Object.assign(
        query,
        buildCompoundCursorQuery(cursor, ['createdAt', '_id'], [-1, -1]),
      );
    }

    const quotes = await this.quoteModel
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const { data, pagination } = processPaginatedResults(quotes, limit, [
      'createdAt',
      '_id',
    ]);

    return {
      quotes: data,
      pagination,
    };
  }

  async getDiscoverFeed({ userId, cursor = null, limit = 20 }: { userId?: string; cursor?: string | null; limit?: number }) {
    // Use cache for discover feed
    const page = this.extractPageFromCursor(cursor);
    
    return await this.quoteCache.getDiscoverFeed(page, async () => {
      const query: any = {
        creator: { $ne: userId },
        isHiddenBySystem: { $ne: true },
      };

      if (userId) {
        const follows = await this.followModel.find({ follower: userId })
          .select('following')
          .lean();
        const followedUserIds = follows.map((f) => f.following);

        const blocks = await this.blockModel.find({
          $or: [{ blocker: userId }, { blocked: userId }],
        }).lean();
        const blockedIds = blocks.map((b) =>
          b.blocker.toString() === userId.toString() ? b.blocked : b.blocker,
        );

        const preferences = await this.preferenceModel.find({ userId }).lean();

        const excludedQuoteIds = preferences
          .filter((p) => p.type === 'QUOTE')
          .map((p) => p.targetId);
        const excludedAuthors = preferences
          .filter((p) => p.type === 'AUTHOR')
          .map((p) => p.targetId);
        const excludedTags = preferences
          .filter((p) => p.type === 'TAG')
          .map((p) => p.targetId);

        const totalExcludedAuthors = [
          ...new Set([
            ...followedUserIds.map((id) => id.toString()),
            ...blockedIds.map((id) => id.toString()),
            ...excludedAuthors.map((id) => id.toString()),
            userId.toString(),
          ]),
        ];

        query.creator = { $nin: totalExcludedAuthors };
        query._id = { $nin: excludedQuoteIds };
        query.tags = { $nin: excludedTags };
      }

      if (cursor) {
        Object.assign(query, buildCursorQuery(cursor, 'createdAt', -1));
      }

      const quotes = await this.quoteModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean();

      const { data, pagination } = processPaginatedResults(quotes, limit, [
        'createdAt',
      ]);

      return {
        quotes: data,
        pagination,
      };
    });
  }
}

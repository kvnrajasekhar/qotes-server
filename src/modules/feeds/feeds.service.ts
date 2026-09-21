import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import type { IQuote } from '../../models/quote.model';
import type { IFollow } from '../../models/follow.model';
import type { IUserBlock } from '../../models/block.model';
import type { IUserContentPreference } from '../../models/userContentPreference.model';
import {
  buildCursorQuery,
  buildCompoundCursorQuery,
  processPaginatedResults,
} from '../../shared/utils/cursor.util';
import { QuoteCacheService } from '../../infrastructure/cache/quote.cache';

@Injectable()
export class FeedsService {
  constructor(
    @InjectModel('Quote') private readonly quoteModel: Model<IQuote>,
    @InjectModel('Follow') private readonly followModel: Model<IFollow>,
    @InjectModel('Block') private readonly blockModel: Model<IUserBlock>,
    @InjectModel('UserContentPreference')
    private readonly preferenceModel: Model<IUserContentPreference>,
    private readonly quoteCache: QuoteCacheService
  ) {}

  async getGlobalFeed({
    userId,
    cursor = null,
    limit = 10,
  }: {
    userId?: string;
    cursor?: string | null;
    limit?: number;
  }) {
    const fetchDbFeed = async () => {
      const query: FilterQuery<IQuote> = { isHiddenBySystem: { $ne: true } };

      if (userId) {
        const [blocks, preferences] = await Promise.all([
          this.blockModel.find({ $or: [{ blocker: userId }, { blocked: userId }] }).lean(),
          this.preferenceModel.find({ userId }).lean(),
        ]);

        const blockedUserIds = blocks.map(b =>
          b.blocker.toString() === userId.toString() ? b.blocked : b.blocker
        );

        const excludedQuoteIds = preferences
          .filter(p => p.type === 'QUOTE')
          .map(p => new Types.ObjectId(p.targetId));
        const excludedAuthors = preferences
          .filter(p => p.type === 'AUTHOR')
          .map(p => new Types.ObjectId(p.targetId));
        const excludedTags = preferences.filter(p => p.type === 'TAG').map(p => p.targetId);

        const finalExcludedCreators = [
          ...new Set([
            ...blockedUserIds.map(id => id.toString()),
            ...excludedAuthors.map(id => id.toString()),
          ]),
        ].map(id => new Types.ObjectId(id));

        if (excludedQuoteIds.length) query._id = { $nin: excludedQuoteIds };
        if (finalExcludedCreators.length) query.creator = { $nin: finalExcludedCreators }; // Fixed from authorId to creator
        if (excludedTags.length) query.tags = { $nin: excludedTags };
      }

      if (cursor) {
        Object.assign(query, buildCursorQuery(cursor, 'createdAt', -1));
      }

      const quotes = await this.quoteModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate('creator', 'username firstName lastName avatarUrl')
        .lean();

      const { data, pagination } = processPaginatedResults(quotes, limit, ['createdAt']);
      return { quotes: data, pagination };
    };

    // Only use public cache when there is NO user-specific block/preference filtering
    if (!userId) {
      const page = this.extractPageFromCursor(cursor);
      return await this.quoteCache.getGlobalFeed(page, fetchDbFeed);
    }

    return await fetchDbFeed();
  }

  async getFollowingFeed({
    userId,
    cursor = null,
    limit = 10,
  }: {
    userId: string;
    cursor?: string | null;
    limit?: number;
  }) {
    const follows = (await this.followModel
      .find({ follower: userId })
      .select('following')
      .lean()) as Array<Pick<IFollow, 'following'>>;

    let followedUserIds = follows.map(f => f.following);

    if (!followedUserIds.length) {
      return { quotes: [], pagination: { nextCursor: null, hasMore: false } };
    }

    const blocks = await this.blockModel
      .find({ $or: [{ blocker: userId }, { blocked: userId }] })
      .lean();

    const blockedIds = new Set(
      blocks.map(b =>
        b.blocker.toString() === userId.toString() ? b.blocked.toString() : b.blocker.toString()
      )
    );

    followedUserIds = followedUserIds.filter(id => !blockedIds.has(id.toString()));

    const preferences = await this.preferenceModel.find({ userId }).lean();
    const excludedQuoteIds = preferences
      .filter(p => p.type === 'QUOTE')
      .map(p => new Types.ObjectId(p.targetId));
    const excludedTags = preferences.filter(p => p.type === 'TAG').map(p => p.targetId);

    const query: FilterQuery<IQuote> = {
      creator: { $in: followedUserIds }, // Fixed from author to creator
      isHiddenBySystem: { $ne: true },
    };

    if (excludedQuoteIds.length) query._id = { $nin: excludedQuoteIds };
    if (excludedTags.length) query.tags = { $nin: excludedTags };

    if (cursor) {
      Object.assign(query, buildCompoundCursorQuery(cursor, ['createdAt', '_id'], [-1, -1]));
    }

    const quotes = await this.quoteModel
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('creator', 'username firstName lastName avatarUrl')
      .lean();

    const { data, pagination } = processPaginatedResults(quotes, limit, ['createdAt', '_id']);

    return { quotes: data, pagination };
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
    if (viewerId) {
      const isBlocked = await this.blockModel
        .findOne({
          $or: [
            { blocker: viewerId, blocked: targetUserId },
            { blocker: targetUserId, blocked: viewerId },
          ],
        })
        .lean();

      if (isBlocked) {
        return {
          quotes: [],
          pagination: { nextCursor: null, hasMore: false },
          isBlocked: true,
        };
      }
    }

    const query: FilterQuery<IQuote> = {
      creator: new Types.ObjectId(targetUserId),
      isHiddenBySystem: { $ne: true },
    };

    if (cursor) {
      Object.assign(query, buildCursorQuery(cursor, 'createdAt', -1));
    }

    const quotes = await this.quoteModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('creator', 'username firstName lastName avatarUrl')
      .lean();

    const { data, pagination } = processPaginatedResults(quotes, limit, ['createdAt']);

    return { quotes: data, pagination };
  }

  async getDiscoverFeed({
    userId,
    cursor = null,
    limit = 10,
  }: {
    userId?: string;
    cursor?: string | null;
    limit?: number;
  }) {
    const query: FilterQuery<IQuote> = { isHiddenBySystem: { $ne: true } };

    if (userId) {
      // Fetch followed users, blocks, and content preferences in parallel
      const [follows, blocks, preferences] = await Promise.all([
        this.followModel.find({ follower: userId }).select('following').lean() as Promise<
          Array<Pick<IFollow, 'following'>>
        >,
        this.blockModel.find({ $or: [{ blocker: userId }, { blocked: userId }] }).lean(),
        this.preferenceModel.find({ userId }).lean(),
      ]);

      const followedUserIds = follows.map(f => f.following.toString());

      const blockedUserIds = blocks.map(b =>
        b.blocker.toString() === userId.toString() ? b.blocked.toString() : b.blocker.toString()
      );

      const excludedAuthors = preferences
        .filter(p => p.type === 'AUTHOR')
        .map(p => p.targetId.toString());

      const excludedQuoteIds = preferences
        .filter(p => p.type === 'QUOTE')
        .map(p => new Types.ObjectId(p.targetId));

      const excludedTags = preferences.filter(p => p.type === 'TAG').map(p => p.targetId);

      // Filter out self, followed users, blocked users, and excluded authors
      const excludedCreators = [
        ...new Set([userId.toString(), ...followedUserIds, ...blockedUserIds, ...excludedAuthors]),
      ].map(id => new Types.ObjectId(id));

      query.creator = { $nin: excludedCreators };
      if (excludedQuoteIds.length) query._id = { $nin: excludedQuoteIds };
      if (excludedTags.length) query.tags = { $nin: excludedTags };
    }

    if (cursor) {
      Object.assign(query, buildCompoundCursorQuery(cursor, ['createdAt', '_id'], [-1, -1]));
    }

    const quotes = await this.quoteModel
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('creator', 'username firstName lastName avatarUrl')
      .lean();

    const { data, pagination } = processPaginatedResults(quotes, limit, ['createdAt', '_id']);

    return { quotes: data, pagination };
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
}

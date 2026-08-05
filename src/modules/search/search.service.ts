import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import mongoose from "mongoose";

import User, { IUser } from "../../models/user.model";
import Quote, { IQuote } from "../../models/quote.model";
import {
  decodeCursor,
  buildCursorQuery,
  processPaginatedResults,
} from "../../shared/utils/cursor.util";
import { SearchCacheService } from "../../infrastructure/cache/search.cache";
import { CacheInvalidationService } from "../../infrastructure/cache/cache-invalidation.service";

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(User.name) private userModel: Model<IUser>,
    @InjectModel(Quote.name) private quoteModel: Model<IQuote>,
    private readonly searchCache: SearchCacheService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async searchUsers({
    query,
    cursor = null,
    limit = 20,
  }: {
    query: string;
    cursor?: any;
    limit?: number;
  }) {
    if (!query || !query.trim()) {
      return {
        users: [],
        pagination: { nextCursor: null, hasMore: false },
      };
    }

    // Use cache for user search results
    return await this.searchCache.getUserSearchResults(query, async () => {
      const escaped = query.replace(/[*+?^${}()|[\]\\]/g, "\\$&");
      const exactRegex = new RegExp(`^${escaped}$`, "i");
      const prefixRegex = new RegExp(`^${escaped}`, "i");
      const containsRegex = new RegExp(escaped, "i");

      const pipeline: any[] = [
        {
          $match: {
            $or: [
              { username: containsRegex },
              { firstName: containsRegex },
              { lastName: containsRegex },
            ],
          },
        },
        {
          $addFields: {
            score: {
              $add: [
                {
                  $cond: [
                    { $regexMatch: { input: "$username", regex: exactRegex } },
                    100,
                    0,
                  ],
                },
                {
                  $cond: [
                    { $regexMatch: { input: "$username", regex: prefixRegex } },
                    60,
                    0,
                  ],
                },
                {
                  $cond: [
                    { $regexMatch: { input: "$firstName", regex: prefixRegex } },
                    40,
                    0,
                  ],
                },
                {
                  $cond: [
                    { $regexMatch: { input: "$lastName", regex: prefixRegex } },
                    40,
                    0,
                  ],
                },
                {
                  $cond: [
                    { $regexMatch: { input: "$username", regex: containsRegex } },
                    20,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: { input: "$firstName", regex: containsRegex },
                    },
                    10,
                    0,
                  ],
                },
                {
                  $cond: [
                    { $regexMatch: { input: "$lastName", regex: containsRegex } },
                    10,
                    0,
                  ],
                },
                { $cond: [{ $gt: ["$stats.followerCount", 1000] }, 15, 0] },
              ],
            },
          },
        },
        { $match: { score: { $gt: 0 } } },
      ];

      if (cursor) {
        const decoded = decodeCursor(cursor);
        pipeline.push({
          $match: {
            $or: [
              { score: { $lt: decoded.score } },
              {
                score: decoded.score,
                _id: { $gt: new mongoose.Types.ObjectId(String(decoded.id)) },
              },
            ],
          },
        });
      }

      pipeline.push(
        { $sort: { score: -1, _id: 1 } },
        { $limit: limit + 1 },
        { $project: { password: 0, __v: 0 } },
      );

      const users = await this.userModel.aggregate(pipeline);
      const { data, pagination } = processPaginatedResults(users, limit, [
        "score",
        "_id",
      ]);

      return {
        users: data,
        pagination,
      };
    });
  }

  async searchGlobal({ query, type = "all", limit = 20, cursor = {} as any }) {
    if (!query || !query.trim()) {
      return {
        results: { users: [], quotes: [], hashtags: [] },
        pagination: { nextCursor: null, hasMore: false },
      };
    }

    const escaped = query.replace(/[*+?^${}()|[\]\\]/g, "\\$&");
    const containsRegex = new RegExp(escaped, "i");
    const prefixRegex = new RegExp(`^${escaped}`, "i");

    const results: any = {
      users: [],
      quotes: [],
      hashtags: [],
    };

    const nextCursor: any = {};

    if (type === "all" || type === "users") {
      const userResult = await this.searchUsers({
        query,
        cursor: cursor.users || null,
        limit,
      });

      results.users = userResult.users;
      nextCursor.users = userResult.pagination.nextCursor;
    }

    if (type === "all" || type === "quotes") {
      // Use cache for quote search results
      results.quotes = await this.searchCache.getQuoteSearchResults(query, async () => {
        const quoteQuery: any = {
          isHiddenBySystem: false,
          $or: [{ text: containsRegex }, { hashtags: prefixRegex }],
        };

        if (cursor?.quotes) {
          Object.assign(
            quoteQuery,
            buildCursorQuery(cursor.quotes, "createdAt", -1),
          );
        }

        const quotes = await this.quoteModel
          .find(quoteQuery)
          .sort({ createdAt: -1 })
          .limit(limit + 1)
          .populate("creator", "username avatarUrl")
          .lean();

        const { data: quoteData, pagination: quotePagination } =
          processPaginatedResults(quotes, limit, ["createdAt"]);

        nextCursor.quotes = quotePagination.nextCursor;
        return quoteData;
      });
    }

    if (type === "all" || type === "hashtags") {
      // Use cache for hashtag search results
      results.hashtags = await this.searchCache.getHashtagSearchResults(query, async () => {
        const hashtags = await this.quoteModel.aggregate([
          { $match: { hashtags: prefixRegex } },
          { $unwind: "$hashtags" },
          { $match: { hashtags: prefixRegex } },
          { $group: { _id: "$hashtags", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: Math.ceil(limit / 3) },
        ]);

        return hashtags.map((h: any) => ({
          tag: h._id,
          usageCount: h.count,
        }));
      });
    }

    return {
      results,
      pagination: {
        nextCursor,
        hasMore: Object.values(nextCursor).some(Boolean),
      },
    };
  }
}

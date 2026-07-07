"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../../models/user.model"));
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const searchService = {
  searchUsers: async ({ query, cursor = null, limit = 20 }) => {
    if (!query || !query.trim()) {
      return {
        users: [],
        pagination: { nextCursor: null, hasMore: false },
      };
    }
    const escaped = query.replace(/[*+?^${}()|[\]\\]/g, "\\$&");
    const exactRegex = new RegExp(`^${escaped}$`, "i");
    const prefixRegex = new RegExp(`^${escaped}`, "i");
    const containsRegex = new RegExp(escaped, "i");
    const pipeline = [
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
              { $cond: [{ $gt: ["$followersCount", 1000] }, 15, 0] },
            ],
          },
        },
      },
      { $match: { score: { $gt: 0 } } },
    ];
    if (cursor) {
      pipeline.push({
        $match: {
          $or: [
            { score: { $lt: cursor.score } },
            {
              score: cursor.score,
              _id: { $gt: new mongoose_1.default.Types.ObjectId(cursor.id) },
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
    const users = await user_model_1.default.aggregate(pipeline);
    const hasMore = users.length > limit;
    if (hasMore) users.pop();
    return {
      users,
      pagination: {
        nextCursor: hasMore
          ? {
              score: users[users.length - 1].score,
              id: users[users.length - 1]._id,
            }
          : null,
        hasMore,
      },
    };
  },
  searchGlobal: async ({ query, type = "all", limit = 20, cursor = {} }) => {
    if (!query || !query.trim()) {
      return {
        results: { users: [], quotes: [], hashtags: [] },
        pagination: { nextCursor: null, hasMore: false },
      };
    }
    const escaped = query.replace(/[*+?^${}()|[\]\\]/g, "\\$&");
    const containsRegex = new RegExp(escaped, "i");
    const prefixRegex = new RegExp(`^${escaped}`, "i");
    const results = {
      users: [],
      quotes: [],
      hashtags: [],
    };
    const nextCursor = {};
    if (type === "all" || type === "users") {
      const userResult = await searchService.searchUsers({
        query,
        cursor: cursor.users || null,
        limit,
      });
      results.users = userResult.users;
      nextCursor.users = userResult.pagination.nextCursor;
    }
    if (type === "all" || type === "quotes") {
      const quoteQuery = {
        isHiddenBySystem: false,
        $or: [{ text: containsRegex }, { hashtags: prefixRegex }],
      };
      if (cursor?.quotes) {
        quoteQuery.createdAt = { $lt: new Date(cursor.quotes) };
      }
      const quotes = await quote_model_1.default
        .find(quoteQuery)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate("creator", "username avatar")
        .lean();
      const hasMore = quotes.length > limit;
      if (hasMore) quotes.pop();
      results.quotes = quotes;
      nextCursor.quotes = hasMore ? quotes[quotes.length - 1].createdAt : null;
    }
    if (type === "all" || type === "hashtags") {
      const hashtags = await quote_model_1.default.aggregate([
        { $match: { hashtags: prefixRegex } },
        { $unwind: "$hashtags" },
        { $match: { hashtags: prefixRegex } },
        { $group: { _id: "$hashtags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: Math.ceil(limit / 3) },
      ]);
      results.hashtags = hashtags.map((h) => ({
        tag: h._id,
        usageCount: h.count,
      }));
    }
    return {
      results,
      pagination: {
        nextCursor,
        hasMore: Object.values(nextCursor).some(Boolean),
      },
    };
  },
};
exports.default = searchService;
//# sourceMappingURL=search.service.js.map

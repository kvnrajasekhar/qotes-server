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
const adminService = {
  getAllUsers: async ({ cursor = null, limit = 20 }) => {
    const query = {};
    if (cursor) {
      query.$or = [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        {
          createdAt: new Date(cursor.createdAt),
          _id: { $gt: new mongoose_1.default.Types.ObjectId(cursor.id) },
        },
      ];
    }
    const users = await user_model_1.default
      .find(query)
      .sort({ createdAt: -1, _id: 1 })
      .limit(limit + 1)
      .select("-password -__v")
      .lean();
    const hasMore = users.length > limit;
    if (hasMore) users.pop();
    return {
      users,
      pagination: {
        nextCursor: hasMore
          ? {
              createdAt: users[users.length - 1].createdAt,
              id: users[users.length - 1]._id,
            }
          : null,
        hasMore,
      },
    };
  },
  getHiddenQuotes: async ({ cursor = null, limit = 20 }) => {
    const query = { isHiddenBySystem: true };
    if (cursor) {
      query.$or = [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        {
          createdAt: new Date(cursor.createdAt),
          _id: { $gt: new mongoose_1.default.Types.ObjectId(cursor.id) },
        },
      ];
    }
    const quotes = await quote_model_1.default
      .find(query)
      .sort({ createdAt: -1, _id: 1 })
      .limit(limit + 1)
      .populate("creator", "username email createdAt")
      .lean();
    const hasMore = quotes.length > limit;
    if (hasMore) quotes.pop();
    return {
      quotes,
      pagination: {
        nextCursor: hasMore
          ? {
              createdAt: quotes[quotes.length - 1].createdAt,
              id: quotes[quotes.length - 1]._id,
            }
          : null,
        hasMore,
      },
    };
  },
};
exports.default = adminService;
//# sourceMappingURL=admin.service.js.map

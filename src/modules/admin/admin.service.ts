import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import mongoose from "mongoose";

import User, { IUser } from "../../models/user.model";
import Quote, { IQuote } from "../../models/quote.model";

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<IUser>,
    @InjectModel(Quote.name) private quoteModel: Model<IQuote>,
  ) {}

  async getAllUsers({
    cursor = null,
    limit = 20,
  }: {
    cursor?: any;
    limit?: number;
  }) {
    const query: any = {};

    if (cursor) {
      query.$or = [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        {
          createdAt: new Date(cursor.createdAt),
          _id: { $gt: new mongoose.Types.ObjectId(cursor.id) },
        },
      ];
    }

    const users = await this.userModel
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
  }

  async getHiddenQuotes({
    cursor = null,
    limit = 20,
  }: {
    cursor?: any;
    limit?: number;
  }) {
    const query: any = { isHiddenBySystem: true };

    if (cursor) {
      query.$or = [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        {
          createdAt: new Date(cursor.createdAt),
          _id: { $gt: new mongoose.Types.ObjectId(cursor.id) },
        },
      ];
    }

    const quotes = await this.quoteModel
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
  }
}

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import mongoose from "mongoose";

import User, { IUser } from "../../models/user.model";
import Quote, { IQuote } from "../../models/quote.model";
import {
  buildCompoundCursorQuery,
  processPaginatedResults,
} from "../../shared/utils/cursor.util";

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
      Object.assign(query, buildCompoundCursorQuery(cursor, ['createdAt', '_id'], [-1, 1]));
    }

    const users = await this.userModel
      .find(query)
      .sort({ createdAt: -1, _id: 1 })
      .limit(limit + 1)
      .select("-password -__v")
      .lean();

    const { data, pagination } = processPaginatedResults(users, limit, ['createdAt', '_id']);

    return {
      users: data,
      pagination,
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
      Object.assign(query, buildCompoundCursorQuery(cursor, ['createdAt', '_id'], [-1, 1]));
    }

    const quotes = await this.quoteModel
      .find(query)
      .sort({ createdAt: -1, _id: 1 })
      .limit(limit + 1)
      .populate("creator", "username email createdAt")
      .lean();

    const { data, pagination } = processPaginatedResults(quotes, limit, ['createdAt', '_id']);

    return {
      quotes: data,
      pagination,
    };
  }
}

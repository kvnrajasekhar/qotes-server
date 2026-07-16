import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import Quote, { IQuote } from "../../models/quote.model";
import User, { IUser } from "../../models/user.model";

@Injectable()
export class QuotesService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<IQuote>,
    @InjectModel(User.name) private userModel: Model<IUser>,
  ) {}
  // Placeholder - migrate from quote.service.ts
}

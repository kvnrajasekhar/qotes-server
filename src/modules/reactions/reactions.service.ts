import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import Reaction, { IReaction } from "../../models/reaction.model";
import Quote, { IQuote } from "../../models/quote.model";

@Injectable()
export class ReactionsService {
  constructor(
    @InjectModel(Reaction.name) private reactionModel: Model<IReaction>,
    @InjectModel(Quote.name) private quoteModel: Model<IQuote>,
  ) {}
}

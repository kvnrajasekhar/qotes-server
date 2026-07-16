import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import Quote, { IQuote } from "../../models/quote.model";

@Injectable()
export class FeedsService {
  constructor(@InjectModel(Quote.name) private quoteModel: Model<IQuote>) {}
}

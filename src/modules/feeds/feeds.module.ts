import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { FeedsController } from "./feeds.controller";
import { FeedsService } from "./feeds.service";
import Quote, { QuoteSchema } from "../../models/quote.model";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Quote.name, schema: QuoteSchema }]),
  ],
  controllers: [FeedsController],
  providers: [FeedsService],
  exports: [FeedsService],
})
export class FeedsModule {}

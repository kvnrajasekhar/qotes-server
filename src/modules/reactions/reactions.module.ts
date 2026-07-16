import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { ReactionsController } from "./reactions.controller";
import { ReactionsService } from "./reactions.service";
import Reaction, { ReactionSchema } from "../../models/reaction.model";
import Quote, { QuoteSchema } from "../../models/quote.model";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reaction.name, schema: ReactionSchema },
      { name: Quote.name, schema: QuoteSchema },
    ]),
  ],
  controllers: [ReactionsController],
  providers: [ReactionsService],
  exports: [ReactionsService],
})
export class ReactionsModule {}

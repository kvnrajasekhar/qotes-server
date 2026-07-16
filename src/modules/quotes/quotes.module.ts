import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";
import Quote, { QuoteSchema } from "../../models/quote.model";
import User, { UserSchema } from "../../models/user.model";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quote.name, schema: QuoteSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}

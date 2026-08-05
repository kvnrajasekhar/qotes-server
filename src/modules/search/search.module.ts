import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import Quote, { QuoteSchema } from "../../models/quote.model";
import User, { UserSchema } from "../../models/user.model";
import { CacheModule } from "../../infrastructure/cache/cache.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quote.name, schema: QuoteSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CacheModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}

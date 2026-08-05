import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { FeedsController } from "./feeds.controller";
import { FeedsService } from "./feeds.service";
import Quote, { QuoteSchema } from "../../models/quote.model";
import Follow, { FollowSchema } from "../../models/follow.model";
import Block, { UserBlockSchema } from "../../models/block.model";
import UserContentPreference, { userContentPreferenceSchema } from "../../models/userContentPreference.model";
import { CacheModule } from "../../infrastructure/cache/cache.module";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Quote.name, schema: QuoteSchema },
      { name: Follow.name, schema: FollowSchema },
      { name: Block.name, schema: UserBlockSchema },
      { name: UserContentPreference.name, schema: userContentPreferenceSchema },
    ]),
    CacheModule,
  ],
  controllers: [FeedsController],
  providers: [FeedsService],
  exports: [FeedsService],
})
export class FeedsModule { }

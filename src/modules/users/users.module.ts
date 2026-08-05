import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule } from "@nestjs/throttler";

import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import User, { UserSchema } from "../../models/user.model";
import Follow, { FollowSchema } from "../../models/follow.model";
import Quote, { QuoteSchema } from "../../models/quote.model";
import { MediaModule } from "../../infrastructure/media/media.module";
import { QueuesModule } from "../../shared/queues/queues.module";
import { CacheModule } from "../../infrastructure/cache/cache.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Follow.name, schema: FollowSchema },
      { name: Quote.name, schema: QuoteSchema },
    ]),
    ThrottlerModule,
    MediaModule,
    QueuesModule,
    CacheModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

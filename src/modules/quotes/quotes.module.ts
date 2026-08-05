import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";
import Quote, { QuoteSchema } from "../../models/quote.model";
import User, { UserSchema } from "../../models/user.model";
import { NotificationsModule } from "../notifications/notifications.module";
import { CacheModule } from "../../infrastructure/cache/cache.module";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Quote.name, schema: QuoteSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => NotificationsModule),
    CacheModule,
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule { }

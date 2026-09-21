import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { FeedsController } from './feeds.controller';
import { FeedsService } from './feeds.service';
import  { QuoteSchema } from '../../models/quote.model';
import  { FollowSchema } from '../../models/follow.model';
import  { UserBlockSchema } from '../../models/block.model';
import  {
  userContentPreferenceSchema,
} from '../../models/userContentPreference.model';
import { CacheModule } from '../../infrastructure/cache/cache.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: "Quote", schema: QuoteSchema },
      { name: "Follow", schema: FollowSchema },
      { name: "Block", schema: UserBlockSchema },
      { name: "UserContentPreference", schema: userContentPreferenceSchema },
    ]),
    CacheModule,
  ],
  controllers: [FeedsController],
  providers: [FeedsService],
  exports: [FeedsService],
})
export class FeedsModule {}

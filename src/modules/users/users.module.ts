import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserSchema } from '../../models/user.model';
import { FollowSchema } from '../../models/follow.model';
import { QuoteSchema } from '../../models/quote.model';
import { MediaModule } from '../../infrastructure/media/media.module';
import { QueuesModule } from '../../shared/queues/queues.module';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Follow', schema: FollowSchema },
      { name: 'Quote', schema: QuoteSchema },
    ]),
    AuthModule,
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

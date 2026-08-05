import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule } from "@nestjs/throttler";
import { EventEmitterModule } from "@nestjs/event-emitter";

// Import feature modules (will be created during migration)
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { QuotesModule } from "./modules/quotes/quotes.module";
import { CollectionsModule } from "./modules/collections/collections.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { ReactionsModule } from "./modules/reactions/reactions.module";
import { FeedsModule } from "./modules/feeds/feeds.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PreferencesModule } from "./modules/preferences/preferences.module";
import { SearchModule } from "./modules/search/search.module";
import { SafetyModule } from "./modules/safety/safety.module";
import { AdminModule } from "./modules/admin/admin.module";
import { SystemModule } from "./modules/system/system.module";

// Import infrastructure modules
import { KafkaModule } from "./infrastructure/kafka/kafka.module";
import { MailerModule } from "./infrastructure/mailer/mailer.module";
import { MediaModule } from "./infrastructure/media/media.module";
import { CacheModule } from "./infrastructure/cache/cache.module";

// Import shared modules
import { QueuesModule } from "./shared/queues/queues.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MongooseModule.forRoot(
      process.env.MONGO_URI || "mongodb://localhost:27017/qotes",
    ),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    EventEmitterModule.forRoot(),

    // Infrastructure modules
    KafkaModule,
    MailerModule,
    MediaModule,
    CacheModule,
    QueuesModule,

    // Feature modules
    AuthModule,
    UsersModule,
    QuotesModule,
    CollectionsModule,
    CommentsModule,
    ReactionsModule,
    FeedsModule,
    NotificationsModule,
    PreferencesModule,
    SearchModule,
    SafetyModule,
    AdminModule,
    SystemModule,
  ],
})
export class AppModule { }

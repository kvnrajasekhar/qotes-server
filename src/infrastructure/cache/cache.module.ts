import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { redis } from "../../shared/utils/redis.utils";
import { CacheManagerService } from "./cache-manager.service";
import { UserCacheService } from "./user.cache";
import { QuoteCacheService } from "./quote.cache";
import { SearchCacheService } from "./search.cache";
import { CollectionsCacheService } from "./collections.cache";
import { NotificationsCacheService } from "./notifications.cache";
import { CacheInvalidationService } from "./cache-invalidation.service";

@Module({
  imports: [EventEmitterModule],
  providers: [
    {
      provide: "REDIS_CLIENT",
      useFactory: () => redis,
    },
    CacheManagerService,
    UserCacheService,
    QuoteCacheService,
    SearchCacheService,
    CollectionsCacheService,
    NotificationsCacheService,
    CacheInvalidationService,
  ],
  exports: [
    "REDIS_CLIENT",
    CacheManagerService,
    UserCacheService,
    QuoteCacheService,
    SearchCacheService,
    CollectionsCacheService,
    NotificationsCacheService,
    CacheInvalidationService,
  ],
})
export class CacheModule { }

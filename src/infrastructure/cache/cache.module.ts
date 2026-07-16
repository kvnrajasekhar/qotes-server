import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { redis } from "../../shared/utils/redis.utils";

@Module({
  providers: [
    {
      provide: "REDIS_CLIENT",
      useFactory: () => redis,
    },
  ],
  exports: ["REDIS_CLIENT"],
})
export class CacheModule {}

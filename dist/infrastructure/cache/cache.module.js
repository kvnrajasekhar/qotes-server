"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheModule = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const redis_utils_1 = require("../../shared/utils/redis.utils");
const cache_manager_service_1 = require("./cache-manager.service");
const user_cache_1 = require("./user.cache");
const quote_cache_1 = require("./quote.cache");
const search_cache_1 = require("./search.cache");
const collections_cache_1 = require("./collections.cache");
const notifications_cache_1 = require("./notifications.cache");
const cache_invalidation_service_1 = require("./cache-invalidation.service");
let CacheModule = class CacheModule {
};
exports.CacheModule = CacheModule;
exports.CacheModule = CacheModule = __decorate([
    (0, common_1.Module)({
        imports: [event_emitter_1.EventEmitterModule],
        providers: [
            {
                provide: "REDIS_CLIENT",
                useFactory: () => redis_utils_1.redis,
            },
            cache_manager_service_1.CacheManagerService,
            user_cache_1.UserCacheService,
            quote_cache_1.QuoteCacheService,
            search_cache_1.SearchCacheService,
            collections_cache_1.CollectionsCacheService,
            notifications_cache_1.NotificationsCacheService,
            cache_invalidation_service_1.CacheInvalidationService,
        ],
        exports: [
            "REDIS_CLIENT",
            cache_manager_service_1.CacheManagerService,
            user_cache_1.UserCacheService,
            quote_cache_1.QuoteCacheService,
            search_cache_1.SearchCacheService,
            collections_cache_1.CollectionsCacheService,
            notifications_cache_1.NotificationsCacheService,
            cache_invalidation_service_1.CacheInvalidationService,
        ],
    })
], CacheModule);
//# sourceMappingURL=cache.module.js.map
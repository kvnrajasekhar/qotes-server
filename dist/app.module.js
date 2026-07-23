"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const quotes_module_1 = require("./modules/quotes/quotes.module");
const collections_module_1 = require("./modules/collections/collections.module");
const comments_module_1 = require("./modules/comments/comments.module");
const reactions_module_1 = require("./modules/reactions/reactions.module");
const feeds_module_1 = require("./modules/feeds/feeds.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const preferences_module_1 = require("./modules/preferences/preferences.module");
const search_module_1 = require("./modules/search/search.module");
const safety_module_1 = require("./modules/safety/safety.module");
const admin_module_1 = require("./modules/admin/admin.module");
const system_module_1 = require("./modules/system/system.module");
const kafka_module_1 = require("./infrastructure/kafka/kafka.module");
const mailer_module_1 = require("./infrastructure/mailer/mailer.module");
const media_module_1 = require("./infrastructure/media/media.module");
const cache_module_1 = require("./infrastructure/cache/cache.module");
const queues_module_1 = require("./shared/queues/queues.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ".env",
            }),
            mongoose_1.MongooseModule.forRoot(process.env.MONGO_URI || "mongodb://localhost:27017/qotes"),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            kafka_module_1.KafkaModule,
            mailer_module_1.MailerModule,
            media_module_1.MediaModule,
            cache_module_1.CacheModule,
            queues_module_1.QueuesModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            quotes_module_1.QuotesModule,
            collections_module_1.CollectionsModule,
            comments_module_1.CommentsModule,
            reactions_module_1.ReactionsModule,
            feeds_module_1.FeedsModule,
            notifications_module_1.NotificationsModule,
            preferences_module_1.PreferencesModule,
            search_module_1.SearchModule,
            safety_module_1.SafetyModule,
            admin_module_1.AdminModule,
            system_module_1.SystemModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
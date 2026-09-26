"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotesModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const auth_module_1 = require("../auth/auth.module");
const quotes_controller_1 = require("./quotes.controller");
const quotes_service_1 = require("./quotes.service");
const quote_model_1 = require("../../models/quote.model");
const user_model_1 = require("../../models/user.model");
const notifications_module_1 = require("../notifications/notifications.module");
const cache_module_1 = require("../../infrastructure/cache/cache.module");
let QuotesModule = class QuotesModule {
};
exports.QuotesModule = QuotesModule;
exports.QuotesModule = QuotesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'Quote', schema: quote_model_1.QuoteSchema },
                { name: 'User', schema: user_model_1.UserSchema },
            ]),
            (0, common_1.forwardRef)(() => notifications_module_1.NotificationsModule),
            cache_module_1.CacheModule,
        ],
        controllers: [quotes_controller_1.QuotesController],
        providers: [quotes_service_1.QuotesService],
        exports: [quotes_service_1.QuotesService],
    })
], QuotesModule);
//# sourceMappingURL=quotes.module.js.map
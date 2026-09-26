"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const auth_module_1 = require("../auth/auth.module");
const feeds_controller_1 = require("./feeds.controller");
const feeds_service_1 = require("./feeds.service");
const quote_model_1 = require("../../models/quote.model");
const follow_model_1 = require("../../models/follow.model");
const block_model_1 = require("../../models/block.model");
const userContentPreference_model_1 = require("../../models/userContentPreference.model");
const cache_module_1 = require("../../infrastructure/cache/cache.module");
let FeedsModule = class FeedsModule {
};
exports.FeedsModule = FeedsModule;
exports.FeedsModule = FeedsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'Quote', schema: quote_model_1.QuoteSchema },
                { name: 'Follow', schema: follow_model_1.FollowSchema },
                { name: 'Block', schema: block_model_1.UserBlockSchema },
                { name: 'UserContentPreference', schema: userContentPreference_model_1.userContentPreferenceSchema },
            ]),
            cache_module_1.CacheModule,
        ],
        controllers: [feeds_controller_1.FeedsController],
        providers: [feeds_service_1.FeedsService],
        exports: [feeds_service_1.FeedsService],
    })
], FeedsModule);
//# sourceMappingURL=feeds.module.js.map
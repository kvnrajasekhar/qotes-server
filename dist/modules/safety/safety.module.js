"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyModule = void 0;
const safety_controller_1 = require("./safety.controller");
const safety_service_1 = require("./safety.service");
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const block_model_1 = require("../../models/block.model");
const report_model_1 = require("../../models/report.model");
const user_model_1 = require("../../models/user.model");
const quote_model_1 = require("../../models/quote.model");
const follow_model_1 = require("../../models/follow.model");
const reportStats_model_1 = require("../../models/reportStats.model");
let SafetyModule = class SafetyModule {
};
exports.SafetyModule = SafetyModule;
exports.SafetyModule = SafetyModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'Block', schema: block_model_1.UserBlockSchema },
                { name: 'Report', schema: report_model_1.reportSchema },
                { name: 'User', schema: user_model_1.UserSchema },
                { name: 'Quote', schema: quote_model_1.QuoteSchema },
                { name: 'Follow', schema: follow_model_1.FollowSchema },
                { name: 'ReportStats', schema: reportStats_model_1.reportStatsSchema },
            ]),
        ],
        controllers: [safety_controller_1.SafetyController],
        providers: [safety_service_1.SafetyService],
        exports: [safety_service_1.SafetyService],
    })
], SafetyModule);
//# sourceMappingURL=safety.module.js.map
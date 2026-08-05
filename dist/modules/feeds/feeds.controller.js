"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedsController = void 0;
const common_1 = require("@nestjs/common");
const feeds_service_1 = require("./feeds.service");
const response_interceptor_1 = require("../../shared/interceptors/response.interceptor");
const auth_guard_1 = require("../../shared/guards/auth.guard");
let FeedsController = class FeedsController {
    constructor(feedsService) {
        this.feedsService = feedsService;
    }
    async getGlobalFeed(req, cursor, limit) {
        const result = await this.feedsService.getGlobalFeed({
            userId: req.user._id,
            cursor: cursor || null,
            limit: parseInt(limit) || 10,
        });
        return {
            success: true,
            statusCode: 200,
            message: 'Quotes retrieved successfully',
            data: result,
        };
    }
    async getFollowingFeed(req, cursor, limit) {
        const result = await this.feedsService.getFollowingFeed({
            userId: req.user._id,
            cursor,
            limit: parseInt(limit, 10) || 10,
        });
        return {
            success: true,
            statusCode: 200,
            message: 'Feed loaded',
            data: result,
        };
    }
    async getDiscoverFeed(req, cursor, limit) {
        const result = await this.feedsService.getDiscoverFeed({
            userId: req.user._id,
            cursor,
            limit: parseInt(limit, 10) || 10,
        });
        return {
            success: true,
            statusCode: 200,
            message: 'Discover feed loaded',
            data: result,
        };
    }
    async getUserQuotes(req, targetuserId, cursor, limit) {
        const result = await this.feedsService.getUserQuotes({
            targetUserId: targetuserId,
            viewerId: req.user._id,
            cursor: cursor || null,
            limit: parseInt(limit) || 10,
        });
        return {
            success: true,
            statusCode: 200,
            message: 'User quotes retrieved successfully',
            data: result,
        };
    }
};
exports.FeedsController = FeedsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('cursor')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], FeedsController.prototype, "getGlobalFeed", null);
__decorate([
    (0, common_1.Get)('following'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('cursor')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], FeedsController.prototype, "getFollowingFeed", null);
__decorate([
    (0, common_1.Get)('discover'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('cursor')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], FeedsController.prototype, "getDiscoverFeed", null);
__decorate([
    (0, common_1.Get)('q/:targetuserId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('targetuserId')),
    __param(2, (0, common_1.Query)('cursor')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], FeedsController.prototype, "getUserQuotes", null);
exports.FeedsController = FeedsController = __decorate([
    (0, common_1.Controller)('feed'),
    (0, common_1.UseInterceptors)(response_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [feeds_service_1.FeedsService])
], FeedsController);
//# sourceMappingURL=feeds.controller.js.map
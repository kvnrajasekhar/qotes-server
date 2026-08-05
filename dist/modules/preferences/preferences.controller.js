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
exports.PreferencesController = void 0;
const common_1 = require("@nestjs/common");
const preferences_service_1 = require("./preferences.service");
const response_interceptor_1 = require("../../shared/interceptors/response.interceptor");
const auth_guard_1 = require("../../shared/guards/auth.guard");
let PreferencesController = class PreferencesController {
    constructor(preferencesService) {
        this.preferencesService = preferencesService;
    }
    async saveNotInterested(req, body) {
        const { type, targetId, reason } = body;
        const userId = req.user?.id;
        const preference = await this.preferencesService.savePreference({
            userId,
            type,
            targetId,
            reason: reason || 'NOT_INTERESTED',
        });
        return {
            success: true,
            statusCode: 201,
            message: `We'll show you less of this ${type.toLowerCase()}.`,
            data: preference,
        };
    }
};
exports.PreferencesController = PreferencesController;
__decorate([
    (0, common_1.Post)('not-interested'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PreferencesController.prototype, "saveNotInterested", null);
exports.PreferencesController = PreferencesController = __decorate([
    (0, common_1.Controller)('preferences'),
    (0, common_1.UseInterceptors)(response_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [preferences_service_1.PreferencesService])
], PreferencesController);
//# sourceMappingURL=preferences.controller.js.map
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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("./notifications.service");
const response_interceptor_1 = require("../../shared/interceptors/response.interceptor");
const auth_guard_1 = require("../../shared/guards/auth.guard");
let NotificationsController = class NotificationsController {
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    async getNotifications(req, cursor, limit, unreadOnly) {
        const userId = req.user?.id;
        const parsedLimit = Number.parseInt(String(limit), 10) || 20;
        const parsedUnreadOnly = typeof unreadOnly === 'string' ? unreadOnly.toLowerCase() === 'true' : Boolean(unreadOnly);
        const result = await this.notificationsService.getNotifications(userId, {
            cursor: typeof cursor === 'string' ? cursor : null,
            limit: parsedLimit,
            unreadOnly: parsedUnreadOnly,
        });
        return {
            success: true,
            statusCode: 200,
            message: 'Notifications retrieved successfully',
            data: result,
        };
    }
    async getUnreadCount(req) {
        const userId = req.user?.id;
        const unreadCount = await this.notificationsService.getUnreadCount(userId);
        return {
            success: true,
            statusCode: 200,
            message: 'Unread count retrieved successfully',
            data: { unreadCount },
        };
    }
    async markAsRead(req, notificationId) {
        const userId = req.user?.id;
        const notification = await this.notificationsService.markAsRead(notificationId, userId);
        return {
            success: true,
            statusCode: 200,
            message: 'Notification marked as read',
            data: notification,
        };
    }
    async markAllAsRead(req) {
        const userId = req.user?.id;
        const result = await this.notificationsService.markAllAsRead(userId);
        return {
            success: true,
            statusCode: 200,
            message: 'All notifications marked as read',
            data: result,
        };
    }
    async deleteNotification(req, notificationId) {
        const userId = req.user?.id;
        const notification = await this.notificationsService.deleteNotification(notificationId, userId);
        return {
            success: true,
            statusCode: 200,
            message: 'Notification deleted successfully',
            data: notification,
        };
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('cursor')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('unreadOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Patch)('read-all'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAllAsRead", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "deleteNotification", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notification'),
    (0, common_1.UseInterceptors)(response_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map
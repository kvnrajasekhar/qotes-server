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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const notification_model_1 = __importDefault(require("../../models/notification.model"));
const notification_constants_1 = require("./notification.constants");
const notification_socket_1 = require("./notification.socket");
const cursor_util_1 = require("../../shared/utils/cursor.util");
let NotificationsService = class NotificationsService {
    constructor(notificationModel) {
        this.notificationModel = notificationModel;
    }
    async createNotification({ recipient, sender, type, message, referenceId, referenceType, metadata = {}, }) {
        try {
            const notification = await this.notificationModel.create({
                recipient,
                sender,
                type,
                message,
                referenceId,
                referenceType,
                metadata,
            });
            await this.sendRealtimeNotification(recipient, notification);
            return notification;
        }
        catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }
    async sendRealtimeNotification(recipientId, notification) {
        try {
            const io = (0, notification_socket_1.getIO)();
            if (!io) {
                console.warn('Socket.IO not initialized, skipping real-time delivery');
                return false;
            }
            const userSocketMap = this.getUserSocketMap();
            const socketIds = userSocketMap.get(recipientId);
            if (socketIds && socketIds.size > 0) {
                socketIds.forEach((socketId) => {
                    io.to(socketId).emit('notification:new', notification);
                });
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Error sending real-time notification:', error);
            return false;
        }
    }
    getUserSocketMap() {
        if (!global.userSocketMap) {
            global.userSocketMap = new Map();
        }
        return global.userSocketMap;
    }
    registerUserSocket(userId, socketId) {
        const userSocketMap = this.getUserSocketMap();
        if (!userSocketMap.has(userId)) {
            userSocketMap.set(userId, new Set());
        }
        userSocketMap.get(userId).add(socketId);
    }
    unregisterUserSocket(userId, socketId) {
        const userSocketMap = this.getUserSocketMap();
        if (userSocketMap.has(userId)) {
            userSocketMap.get(userId).delete(socketId);
            if (userSocketMap.get(userId).size === 0) {
                userSocketMap.delete(userId);
            }
        }
    }
    isUserOnline(userId) {
        const userSocketMap = this.getUserSocketMap();
        return userSocketMap.has(userId) && userSocketMap.get(userId).size > 0;
    }
    async getNotifications(userId, { cursor = null, limit = notification_constants_1.NOTIFICATION_CONFIG.DEFAULT_PAGE_SIZE, unreadOnly = false, } = {}) {
        try {
            const sanitizedLimit = Math.min(limit, notification_constants_1.NOTIFICATION_CONFIG.MAX_PAGE_SIZE);
            const query = {
                recipient: userId,
                isDeleted: false,
            };
            if (unreadOnly) {
                query.isRead = false;
            }
            if (cursor) {
                Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, 'createdAt', -1));
            }
            const notifications = await this.notificationModel
                .find(query)
                .populate('sender', 'username name avatarUrl')
                .sort({ createdAt: -1 })
                .limit(sanitizedLimit + 1)
                .lean();
            const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(notifications, sanitizedLimit, ['createdAt']);
            return {
                notifications: data,
                pagination,
            };
        }
        catch (error) {
            console.error('Error getting notifications:', error);
            throw error;
        }
    }
    async markAsRead(notificationId, userId) {
        try {
            const notification = await this.notificationModel.findOne({
                _id: notificationId,
                recipient: userId,
                isDeleted: false,
            });
            if (!notification) {
                throw new Error('Notification not found');
            }
            if (notification.isRead) {
                return notification;
            }
            notification.isRead = true;
            await notification.save();
            await this.emitUnreadCount(userId);
            return notification;
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }
    async markAllAsRead(userId) {
        try {
            const result = await this.notificationModel.updateMany({
                recipient: userId,
                isRead: false,
                isDeleted: false,
            }, { isRead: true });
            await this.emitUnreadCount(userId);
            return {
                modifiedCount: result.modifiedCount,
            };
        }
        catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }
    async getUnreadCount(userId) {
        try {
            const count = await this.notificationModel.countDocuments({
                recipient: userId,
                isRead: false,
                isDeleted: false,
            });
            return count;
        }
        catch (error) {
            console.error('Error getting unread count:', error);
            throw error;
        }
    }
    async emitUnreadCount(userId) {
        try {
            const io = (0, notification_socket_1.getIO)();
            if (!io) {
                return;
            }
            const unreadCount = await this.getUnreadCount(userId);
            const userSocketMap = this.getUserSocketMap();
            const socketIds = userSocketMap.get(userId);
            if (socketIds && socketIds.size > 0) {
                socketIds.forEach((socketId) => {
                    io.to(socketId).emit('notification:count', { unreadCount });
                });
            }
        }
        catch (error) {
            console.error('Error emitting unread count:', error);
        }
    }
    async deleteNotification(notificationId, userId) {
        try {
            const notification = await this.notificationModel.findOne({
                _id: notificationId,
                recipient: userId,
            });
            if (!notification) {
                throw new Error('Notification not found');
            }
            notification.isDeleted = true;
            await notification.save();
            return notification;
        }
        catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notification_model_1.default.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map
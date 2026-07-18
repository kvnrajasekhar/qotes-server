"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const notification_service_1 = __importDefault(require("./notification.service"));
const responseFormatter_util_1 = require("../../shared/utils/responseFormatter.util");
const getNotifications = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const parsedUnreadOnly = unreadOnly === "true" || unreadOnly === true;
    const result = await notification_service_1.default.getNotifications(userId, {
        page: parsedPage,
        limit: parsedLimit,
        unreadOnly: parsedUnreadOnly,
    });
    return (0, responseFormatter_util_1.successResponse)(res, 200, "Notifications retrieved successfully", result);
});
const getUnreadCount = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const unreadCount = await notification_service_1.default.getUnreadCount(userId);
    return (0, responseFormatter_util_1.successResponse)(res, 200, "Unread count retrieved successfully", {
        unreadCount,
    });
});
const markAsRead = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const notificationId = req.params.id;
    try {
        const notification = await notification_service_1.default.markAsRead(notificationId, userId);
        return (0, responseFormatter_util_1.successResponse)(res, 200, "Notification marked as read", notification);
    }
    catch (error) {
        if (error.message === "Notification not found") {
            return (0, responseFormatter_util_1.errorResponse)(res, 404, "Notification not found");
        }
        throw error;
    }
});
const markAllAsRead = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const result = await notification_service_1.default.markAllAsRead(userId);
    return (0, responseFormatter_util_1.successResponse)(res, 200, "All notifications marked as read", result);
});
const deleteNotification = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user.userId;
    const notificationId = req.params.id;
    try {
        const notification = await notification_service_1.default.deleteNotification(notificationId, userId);
        return (0, responseFormatter_util_1.successResponse)(res, 200, "Notification deleted successfully", notification);
    }
    catch (error) {
        if (error.message === "Notification not found") {
            return (0, responseFormatter_util_1.errorResponse)(res, 404, "Notification not found");
        }
        throw error;
    }
});
const notificationController = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
};
exports.default = notificationController;
//# sourceMappingURL=notification.controller.js.map
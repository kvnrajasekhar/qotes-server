"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const notification_model_1 = __importDefault(require("../../models/notification.model"));
const notification_constants_1 = require("./notification.constants");
const notification_socket_1 = require("./notification.socket");
const cursor_util_1 = require("../../shared/utils/cursor.util");
const createNotification = async ({ recipient, sender, type, message, referenceId, referenceType, metadata = {}, }) => {
    try {
        const notification = await notification_model_1.default.create({
            recipient,
            sender,
            type,
            message,
            referenceId,
            referenceType,
            metadata,
        });
        await sendRealtimeNotification(recipient, notification);
        return notification;
    }
    catch (error) {
        console.error("Error creating notification:", error);
        throw error;
    }
};
const sendRealtimeNotification = async (recipientId, notification) => {
    try {
        const io = (0, notification_socket_1.getIO)();
        if (!io) {
            console.warn("Socket.IO not initialized, skipping real-time delivery");
            return false;
        }
        const userSocketMap = getUserSocketMap();
        const socketIds = userSocketMap.get(recipientId);
        if (socketIds && socketIds.size > 0) {
            socketIds.forEach((socketId) => {
                io.to(socketId).emit("notification:new", notification);
            });
            return true;
        }
        return false;
    }
    catch (error) {
        console.error("Error sending real-time notification:", error);
        return false;
    }
};
const getUserSocketMap = () => {
    if (!global.userSocketMap) {
        global.userSocketMap = new Map();
    }
    return global.userSocketMap;
};
const registerUserSocket = (userId, socketId) => {
    const userSocketMap = getUserSocketMap();
    if (!userSocketMap.has(userId)) {
        userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socketId);
};
const unregisterUserSocket = (userId, socketId) => {
    const userSocketMap = getUserSocketMap();
    if (userSocketMap.has(userId)) {
        userSocketMap.get(userId).delete(socketId);
        if (userSocketMap.get(userId).size === 0) {
            userSocketMap.delete(userId);
        }
    }
};
const isUserOnline = (userId) => {
    const userSocketMap = getUserSocketMap();
    return userSocketMap.has(userId) && userSocketMap.get(userId).size > 0;
};
const getNotifications = async (userId, { cursor = null, limit = notification_constants_1.NOTIFICATION_CONFIG.DEFAULT_PAGE_SIZE, unreadOnly = false, } = {}) => {
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
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, "createdAt", -1));
        }
        const notifications = await notification_model_1.default.find(query)
            .populate("sender", "username name avatar")
            .sort({ createdAt: -1 })
            .limit(sanitizedLimit + 1)
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(notifications, sanitizedLimit, ["createdAt"]);
        return {
            notifications: data,
            pagination,
        };
    }
    catch (error) {
        console.error("Error getting notifications:", error);
        throw error;
    }
};
const markAsRead = async (notificationId, userId) => {
    try {
        const notification = await notification_model_1.default.findOne({
            _id: notificationId,
            recipient: userId,
            isDeleted: false,
        });
        if (!notification) {
            throw new Error("Notification not found");
        }
        if (notification.isRead) {
            return notification;
        }
        notification.isRead = true;
        await notification.save();
        await emitUnreadCount(userId);
        return notification;
    }
    catch (error) {
        console.error("Error marking notification as read:", error);
        throw error;
    }
};
const markAllAsRead = async (userId) => {
    try {
        const result = await notification_model_1.default.updateMany({
            recipient: userId,
            isRead: false,
            isDeleted: false,
        }, { isRead: true });
        await emitUnreadCount(userId);
        return {
            modifiedCount: result.modifiedCount,
        };
    }
    catch (error) {
        console.error("Error marking all notifications as read:", error);
        throw error;
    }
};
const getUnreadCount = async (userId) => {
    try {
        const count = await notification_model_1.default.countDocuments({
            recipient: userId,
            isRead: false,
            isDeleted: false,
        });
        return count;
    }
    catch (error) {
        console.error("Error getting unread count:", error);
        throw error;
    }
};
const emitUnreadCount = async (userId) => {
    try {
        const io = (0, notification_socket_1.getIO)();
        if (!io) {
            return;
        }
        const unreadCount = await getUnreadCount(userId);
        const userSocketMap = getUserSocketMap();
        const socketIds = userSocketMap.get(userId);
        if (socketIds && socketIds.size > 0) {
            socketIds.forEach((socketId) => {
                io.to(socketId).emit("notification:count", { unreadCount });
            });
        }
    }
    catch (error) {
        console.error("Error emitting unread count:", error);
    }
};
const deleteNotification = async (notificationId, userId) => {
    try {
        const notification = await notification_model_1.default.findOne({
            _id: notificationId,
            recipient: userId,
        });
        if (!notification) {
            throw new Error("Notification not found");
        }
        notification.isDeleted = true;
        await notification.save();
        return notification;
    }
    catch (error) {
        console.error("Error deleting notification:", error);
        throw error;
    }
};
const notificationService = {
    createNotification,
    sendRealtimeNotification,
    getUserSocketMap,
    registerUserSocket,
    unregisterUserSocket,
    isUserOnline,
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    emitUnreadCount,
    deleteNotification,
};
exports.default = notificationService;
//# sourceMappingURL=notification.service.js.map
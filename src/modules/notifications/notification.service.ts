// @ts-nocheck
import Notification from "../../models/notification.model";
import { NOTIFICATION_CONFIG } from "./notification.constants";
import { getIO } from "./notification.socket";
import {
  buildCursorQuery,
  processPaginatedResults,
} from "../../shared/utils/cursor.util";

declare global {
  var userSocketMap: Map<string, Set<string>> | undefined;
}

interface CreateNotificationData {
  recipient: string;
  sender: string;
  type: string;
  message: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: any;
}

interface GetNotificationsOptions {
  cursor?: string | null;
  limit?: number;
  unreadOnly?: boolean;
}

const createNotification = async ({
  recipient,
  sender,
  type,
  message,
  referenceId,
  referenceType,
  metadata = {},
}: CreateNotificationData) => {
  try {
    const notification = await Notification.create({
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
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

const sendRealtimeNotification = async (
  recipientId: string,
  notification: any,
) => {
  try {
    const io = getIO();
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
  } catch (error) {
    console.error("Error sending real-time notification:", error);
    return false;
  }
};

const getUserSocketMap = (): Map<string, Set<string>> => {
  if (!global.userSocketMap) {
    global.userSocketMap = new Map();
  }
  return global.userSocketMap;
};

const registerUserSocket = (userId: string, socketId: string) => {
  const userSocketMap = getUserSocketMap();
  if (!userSocketMap.has(userId)) {
    userSocketMap.set(userId, new Set());
  }
  userSocketMap.get(userId)!.add(socketId);
};

const unregisterUserSocket = (userId: string, socketId: string) => {
  const userSocketMap = getUserSocketMap();
  if (userSocketMap.has(userId)) {
    userSocketMap.get(userId)!.delete(socketId);
    if (userSocketMap.get(userId)!.size === 0) {
      userSocketMap.delete(userId);
    }
  }
};

const isUserOnline = (userId: string): boolean => {
  const userSocketMap = getUserSocketMap();
  return userSocketMap.has(userId) && userSocketMap.get(userId)!.size > 0;
};

const getNotifications = async (
  userId: string,
  {
    cursor = null,
    limit = NOTIFICATION_CONFIG.DEFAULT_PAGE_SIZE,
    unreadOnly = false,
  }: GetNotificationsOptions = {},
) => {
  try {
    const sanitizedLimit = Math.min(limit, NOTIFICATION_CONFIG.MAX_PAGE_SIZE);

    const query: any = {
      recipient: userId,
      isDeleted: false,
    };

    if (unreadOnly) {
      query.isRead = false;
    }

    if (cursor) {
      Object.assign(query, buildCursorQuery(cursor, "createdAt", -1));
    }

    const notifications = await Notification.find(query)
      .populate("sender", "username name avatar")
      .sort({ createdAt: -1 })
      .limit(sanitizedLimit + 1)
      .lean();

    const { data, pagination } = processPaginatedResults(
      notifications,
      sanitizedLimit,
      ["createdAt"],
    );

    return {
      notifications: data,
      pagination,
    };
  } catch (error) {
    console.error("Error getting notifications:", error);
    throw error;
  }
};

const markAsRead = async (notificationId: string, userId: string) => {
  try {
    const notification = await Notification.findOne({
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
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

const markAllAsRead = async (userId: string) => {
  try {
    const result = await Notification.updateMany(
      {
        recipient: userId,
        isRead: false,
        isDeleted: false,
      },
      { isRead: true },
    );

    await emitUnreadCount(userId);

    return {
      modifiedCount: result.modifiedCount,
    };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
      isDeleted: false,
    });
    return count;
  } catch (error) {
    console.error("Error getting unread count:", error);
    throw error;
  }
};

const emitUnreadCount = async (userId: string) => {
  try {
    const io = getIO();
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
  } catch (error) {
    console.error("Error emitting unread count:", error);
  }
};

const deleteNotification = async (notificationId: string, userId: string) => {
  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    notification.isDeleted = true;
    await notification.save();

    return notification;
  } catch (error) {
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

export default notificationService;

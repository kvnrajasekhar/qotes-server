import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import Notification, { INotification } from '../../models/notification.model';
import { NOTIFICATION_CONFIG } from './notification.constants';
import { getIO } from './notification.socket';
import {
  buildCursorQuery,
  processPaginatedResults,
} from '../../shared/utils/cursor.util';

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

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<INotification>,
  ) {}

  async createNotification({
    recipient,
    sender,
    type,
    message,
    referenceId,
    referenceType,
    metadata = {},
  }: CreateNotificationData) {
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
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async sendRealtimeNotification(recipientId: string, notification: any) {
    try {
      const io = getIO();
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
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      return false;
    }
  }

  getUserSocketMap(): Map<string, Set<string>> {
    if (!global.userSocketMap) {
      global.userSocketMap = new Map();
    }
    return global.userSocketMap;
  }

  registerUserSocket(userId: string, socketId: string) {
    const userSocketMap = this.getUserSocketMap();
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId)!.add(socketId);
  }

  unregisterUserSocket(userId: string, socketId: string) {
    const userSocketMap = this.getUserSocketMap();
    if (userSocketMap.has(userId)) {
      userSocketMap.get(userId)!.delete(socketId);
      if (userSocketMap.get(userId)!.size === 0) {
        userSocketMap.delete(userId);
      }
    }
  }

  isUserOnline(userId: string): boolean {
    const userSocketMap = this.getUserSocketMap();
    return userSocketMap.has(userId) && userSocketMap.get(userId)!.size > 0;
  }

  async getNotifications(
    userId: string,
    {
      cursor = null,
      limit = NOTIFICATION_CONFIG.DEFAULT_PAGE_SIZE,
      unreadOnly = false,
    }: GetNotificationsOptions = {},
  ) {
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
        Object.assign(query, buildCursorQuery(cursor, 'createdAt', -1));
      }

      const notifications = await this.notificationModel
        .find(query)
        .populate('sender', 'username name avatarUrl')
        .sort({ createdAt: -1 })
        .limit(sanitizedLimit + 1)
        .lean();

      const { data, pagination } = processPaginatedResults(
        notifications,
        sanitizedLimit,
        ['createdAt'],
      );

      return {
        notifications: data,
        pagination,
      };
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string) {
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
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const result = await this.notificationModel.updateMany(
        {
          recipient: userId,
          isRead: false,
          isDeleted: false,
        },
        { isRead: true },
      );

      await this.emitUnreadCount(userId);

      return {
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await this.notificationModel.countDocuments({
        recipient: userId,
        isRead: false,
        isDeleted: false,
      });
      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  async emitUnreadCount(userId: string) {
    try {
      const io = getIO();
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
    } catch (error) {
      console.error('Error emitting unread count:', error);
    }
  }

  async deleteNotification(notificationId: string, userId: string) {
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
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

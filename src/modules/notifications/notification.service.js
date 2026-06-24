const Notification = require("../../models/notification.model");
const { NOTIFICATION_CONFIG } = require("./notification.constants");
const { getIO } = require("./notification.socket");

/**
 * Notification Service
 * Handles all notification-related business logic
 */
const notificationService = {
  /**
   * Create a new notification and deliver it if recipient is online
   * @param {Object} data - Notification data
   * @param {string} data.recipient - User ID of notification recipient
   * @param {string} data.sender - User ID of notification sender
   * @param {string} data.type - Notification type
   * @param {string} data.message - Human-readable message
   * @param {string} [data.referenceId] - ID of referenced content
   * @param {string} [data.referenceType] - Type of referenced content
   * @param {Object} [data.metadata] - Additional context data
   * @returns {Promise<Object>} Created notification document
   */
  createNotification: async ({
    recipient,
    sender,
    type,
    message,
    referenceId,
    referenceType,
    metadata = {},
  }) => {
    try {
      // Create notification document
      const notification = await Notification.create({
        recipient,
        sender,
        type,
        message,
        referenceId,
        referenceType,
        metadata,
      });

      // Attempt real-time delivery
      await notificationService.sendRealtimeNotification(
        recipient,
        notification,
      );

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  },

  /**
   * Emit notification to online user via Socket.IO
   * @param {string} recipientId - User ID of recipient
   * @param {Object} notification - Notification document
   * @returns {Promise<boolean>} True if delivery was attempted
   */
  sendRealtimeNotification: async (recipientId, notification) => {
    try {
      const io = getIO();
      if (!io) {
        console.warn("Socket.IO not initialized, skipping real-time delivery");
        return false;
      }

      // Check if user is online and get their socket IDs
      const userSocketMap = notificationService.getUserSocketMap();
      const socketIds = userSocketMap.get(recipientId);

      if (socketIds && socketIds.size > 0) {
        // Emit to all sockets for this user
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
  },

  /**
   * Get user-socket mapping (in-memory for free-tier)
   * @returns {Map} User ID to Set of socket IDs mapping
   */
  getUserSocketMap: () => {
    if (!global.userSocketMap) {
      global.userSocketMap = new Map();
    }
    return global.userSocketMap;
  },

  /**
   * Register user socket connection
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   */
  registerUserSocket: (userId, socketId) => {
    const userSocketMap = notificationService.getUserSocketMap();
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socketId);
  },

  /**
   * Unregister user socket connection
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   */
  unregisterUserSocket: (userId, socketId) => {
    const userSocketMap = notificationService.getUserSocketMap();
    if (userSocketMap.has(userId)) {
      userSocketMap.get(userId).delete(socketId);
      if (userSocketMap.get(userId).size === 0) {
        userSocketMap.delete(userId);
      }
    }
  },

  /**
   * Check if user is online
   * @param {string} userId - User ID
   * @returns {boolean} True if user is online
   */
  isUserOnline: (userId) => {
    const userSocketMap = notificationService.getUserSocketMap();
    return userSocketMap.has(userId) && userSocketMap.get(userId).size > 0;
  },

  /**
   * Retrieve paginated notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Items per page
   * @param {boolean} [options.unreadOnly=false] - Filter unread only
   * @returns {Promise<Object>} Paginated notification list with metadata
   */
  getNotifications: async (
    userId,
    {
      page = 1,
      limit = NOTIFICATION_CONFIG.DEFAULT_PAGE_SIZE,
      unreadOnly = false,
    } = {},
  ) => {
    try {
      // Validate and sanitize limit
      const sanitizedLimit = Math.min(limit, NOTIFICATION_CONFIG.MAX_PAGE_SIZE);
      const skip = (page - 1) * sanitizedLimit;

      // Build query
      const query = {
        recipient: userId,
        isDeleted: false,
      };

      if (unreadOnly) {
        query.isRead = false;
      }

      // Execute query with pagination
      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .populate("sender", "username name avatar")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(sanitizedLimit)
          .lean(),
        Notification.countDocuments(query),
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / sanitizedLimit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        notifications,
        pagination: {
          currentPage: page,
          itemsPerPage: sanitizedLimit,
          totalItems: total,
          totalPages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error) {
      console.error("Error getting notifications:", error);
      throw error;
    }
  },

  /**
   * Mark a specific notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID requesting the action
   * @returns {Promise<Object>} Updated notification document
   */
  markAsRead: async (notificationId, userId) => {
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
        return notification; // Already read
      }

      notification.isRead = true;
      await notification.save();

      // Emit updated count via Socket.IO
      await notificationService.emitUnreadCount(userId);

      return notification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },

  /**
   * Mark all notifications for a user as read
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Count of modified notifications
   */
  markAllAsRead: async (userId) => {
    try {
      const result = await Notification.updateMany(
        {
          recipient: userId,
          isRead: false,
          isDeleted: false,
        },
        { isRead: true },
      );

      // Emit updated count via Socket.IO
      await notificationService.emitUnreadCount(userId);

      return {
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  },

  /**
   * Get count of unread notifications for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of unread notifications
   */
  getUnreadCount: async (userId) => {
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
  },

  /**
   * Emit unread count to user via Socket.IO
   * @param {string} userId - User ID
   */
  emitUnreadCount: async (userId) => {
    try {
      const io = getIO();
      if (!io) {
        return;
      }

      const unreadCount = await notificationService.getUnreadCount(userId);
      const userSocketMap = notificationService.getUserSocketMap();
      const socketIds = userSocketMap.get(userId);

      if (socketIds && socketIds.size > 0) {
        socketIds.forEach((socketId) => {
          io.to(socketId).emit("notification:count", { unreadCount });
        });
      }
    } catch (error) {
      console.error("Error emitting unread count:", error);
    }
  },

  /**
   * Soft delete a notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID requesting the action
   * @returns {Promise<Object>} Updated notification document
   */
  deleteNotification: async (notificationId, userId) => {
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
  },
};

module.exports = notificationService;

const asyncHandler = require("express-async-handler");
const notificationService = require("./notification.service");
const {
  successResponse,
  errorResponse,
} = require("../../shared/utils/responseFormatter.util");

/**
 * Notification Controller
 * Handles HTTP requests for notification endpoints
 */
const notificationController = {
  /**
   * Get notifications for authenticated user
   * GET /api/notifications
   */
  getNotifications: asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    // Parse query parameters
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const parsedUnreadOnly = unreadOnly === "true" || unreadOnly === true;

    const result = await notificationService.getNotifications(userId, {
      page: parsedPage,
      limit: parsedLimit,
      unreadOnly: parsedUnreadOnly,
    });

    return successResponse(
      res,
      200,
      "Notifications retrieved successfully",
      result,
    );
  }),

  /**
   * Get unread notification count for authenticated user
   * GET /api/notifications/unread-count
   */
  getUnreadCount: asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const unreadCount = await notificationService.getUnreadCount(userId);

    return successResponse(res, 200, "Unread count retrieved successfully", {
      unreadCount,
    });
  }),

  /**
   * Mark a specific notification as read
   * PATCH /api/notifications/:id/read
   */
  markAsRead: asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const notificationId = req.params.id;

    try {
      const notification = await notificationService.markAsRead(
        notificationId,
        userId,
      );
      return successResponse(
        res,
        200,
        "Notification marked as read",
        notification,
      );
    } catch (error) {
      if (error.message === "Notification not found") {
        return errorResponse(res, 404, "Notification not found");
      }
      throw error;
    }
  }),

  /**
   * Mark all notifications as read for authenticated user
   * PATCH /api/notifications/read-all
   */
  markAllAsRead: asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const result = await notificationService.markAllAsRead(userId);
    return successResponse(
      res,
      200,
      "All notifications marked as read",
      result,
    );
  }),

  /**
   * Delete a notification (soft delete)
   * DELETE /api/notifications/:id
   */
  deleteNotification: asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const notificationId = req.params.id;

    try {
      const notification = await notificationService.deleteNotification(
        notificationId,
        userId,
      );
      return successResponse(
        res,
        200,
        "Notification deleted successfully",
        notification,
      );
    } catch (error) {
      if (error.message === "Notification not found") {
        return errorResponse(res, 404, "Notification not found");
      }
      throw error;
    }
  }),
};

module.exports = notificationController;

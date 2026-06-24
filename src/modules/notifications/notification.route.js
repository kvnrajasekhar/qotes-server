const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const authMiddleware = require("../../shared/middlewares/auth.middleware");
const notificationController = require("./notification.controller");

/**
 * Notification Routes
 * All routes require authentication
 */

// Get notifications for authenticated user
router.get(
  "/",
  authMiddleware,
  asyncHandler(notificationController.getNotifications),
);

// Get unread notification count
router.get(
  "/unread-count",
  authMiddleware,
  asyncHandler(notificationController.getUnreadCount),
);

// Mark a specific notification as read
router.patch(
  "/:id/read",
  authMiddleware,
  asyncHandler(notificationController.markAsRead),
);

// Mark all notifications as read
router.patch(
  "/read-all",
  authMiddleware,
  asyncHandler(notificationController.markAllAsRead),
);

// Delete a notification (soft delete)
router.delete(
  "/:id",
  authMiddleware,
  asyncHandler(notificationController.deleteNotification),
);

module.exports = router;

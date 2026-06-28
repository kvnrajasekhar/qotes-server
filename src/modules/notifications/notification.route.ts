import express from "express";
import asyncHandler from "express-async-handler";
import authMiddleware from "../../shared/middlewares/auth.middleware";
import notificationController from "./notification.controller";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  asyncHandler(notificationController.getNotifications),
);

router.get(
  "/unread-count",
  authMiddleware,
  asyncHandler(notificationController.getUnreadCount),
);

router.patch(
  "/:id/read",
  authMiddleware,
  asyncHandler(notificationController.markAsRead),
);

router.patch(
  "/read-all",
  authMiddleware,
  asyncHandler(notificationController.markAllAsRead),
);

router.delete(
  "/:id",
  authMiddleware,
  asyncHandler(notificationController.deleteNotification),
);

export default router;

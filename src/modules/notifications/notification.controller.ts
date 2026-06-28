import asyncHandler from "express-async-handler";
import notificationService from "./notification.service";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/responseFormatter.util";
import { Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
      };
    }
  }
}

const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { page = 1, limit = 20, unreadOnly = false } = req.query;

  const parsedPage = parseInt(page as string, 10);
  const parsedLimit = parseInt(limit as string, 10);
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
});

const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const unreadCount = await notificationService.getUnreadCount(userId);

  return successResponse(res, 200, "Unread count retrieved successfully", {
    unreadCount,
  });
});

const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
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
  } catch (error: any) {
    if (error.message === "Notification not found") {
      return errorResponse(res, 404, "Notification not found");
    }
    throw error;
  }
});

const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const result = await notificationService.markAllAsRead(userId);
  return successResponse(res, 200, "All notifications marked as read", result);
});

const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
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
  } catch (error: any) {
    if (error.message === "Notification not found") {
      return errorResponse(res, 404, "Notification not found");
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

export default notificationController;

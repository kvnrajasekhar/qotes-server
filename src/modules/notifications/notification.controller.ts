import asyncHandler from 'express-async-handler';
import notificationService from './notification.service';
import { successResponse, errorResponse } from '../../shared/utils/responseFormatter.util';

const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    errorResponse(res, 401, 'Unauthorized');
    return;
  }

  const { cursor, limit = 20, unreadOnly = false } = req.query;

  const parsedLimit = Number.parseInt(String(limit), 10) || 20;
  const parsedUnreadOnly =
    typeof unreadOnly === 'string' ? unreadOnly.toLowerCase() === 'true' : Boolean(unreadOnly);

  const result = await notificationService.getNotifications(userId, {
    cursor: typeof cursor === 'string' ? cursor : null,
    limit: parsedLimit,
    unreadOnly: parsedUnreadOnly,
  });

  successResponse(res, 200, 'Notifications retrieved successfully', result);
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    errorResponse(res, 401, 'Unauthorized');
    return;
  }

  const unreadCount = await notificationService.getUnreadCount(userId);

  successResponse(res, 200, 'Unread count retrieved successfully', {
    unreadCount,
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    errorResponse(res, 401, 'Unauthorized');
    return;
  }

  const notificationId = req.params.id;

  try {
    const notification = await notificationService.markAsRead(notificationId as string, userId);
    successResponse(res, 200, 'Notification marked as read', notification);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Notification not found') {
      errorResponse(res, 404, 'Notification not found');
      return;
    }
    throw error;
  }
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    errorResponse(res, 401, 'Unauthorized');
    return;
  }

  const result = await notificationService.markAllAsRead(userId);
  successResponse(res, 200, 'All notifications marked as read', result);
});

const deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    errorResponse(res, 401, 'Unauthorized');
    return;
  }

  const notificationId = req.params.id;

  try {
    const notification = await notificationService.deleteNotification(
      notificationId as string,
      userId
    );
    successResponse(res, 200, 'Notification deleted successfully', notification);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Notification not found') {
      errorResponse(res, 404, 'Notification not found');
      return;
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

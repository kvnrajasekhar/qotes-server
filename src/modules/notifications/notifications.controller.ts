import { Controller, UseInterceptors, Get, Patch, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ResponseInterceptor } from '../../shared/interceptors/response.interceptor';
import { AuthGuard } from '../../shared/guards/auth.guard';

@Controller('notification')
@UseInterceptors(ResponseInterceptor)
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@Request() req: any, @Query('cursor') cursor?: string, @Query('limit') limit?: string, @Query('unreadOnly') unreadOnly?: string) {
    const userId = req.user?.id;
    const parsedLimit = Number.parseInt(String(limit), 10) || 20;
    const parsedUnreadOnly = typeof unreadOnly === 'string' ? unreadOnly.toLowerCase() === 'true' : Boolean(unreadOnly);

    const result = await this.notificationsService.getNotifications(userId, {
      cursor: typeof cursor === 'string' ? cursor : null,
      limit: parsedLimit,
      unreadOnly: parsedUnreadOnly,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Notifications retrieved successfully',
      data: result,
    };
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user?.id;
    const unreadCount = await this.notificationsService.getUnreadCount(userId);

    return {
      success: true,
      statusCode: 200,
      message: 'Unread count retrieved successfully',
      data: { unreadCount },
    };
  }

  @Patch(':id/read')
  async markAsRead(@Request() req: any, @Param('id') notificationId: string) {
    const userId = req.user?.id;
    const notification = await this.notificationsService.markAsRead(notificationId, userId);

    return {
      success: true,
      statusCode: 200,
      message: 'Notification marked as read',
      data: notification,
    };
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user?.id;
    const result = await this.notificationsService.markAllAsRead(userId);

    return {
      success: true,
      statusCode: 200,
      message: 'All notifications marked as read',
      data: result,
    };
  }

  @Delete(':id')
  async deleteNotification(@Request() req: any, @Param('id') notificationId: string) {
    const userId = req.user?.id;
    const notification = await this.notificationsService.deleteNotification(notificationId, userId);

    return {
      success: true,
      statusCode: 200,
      message: 'Notification deleted successfully',
      data: notification,
    };
  }
}

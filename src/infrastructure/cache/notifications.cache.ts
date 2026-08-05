import { Injectable, Logger } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';
import { RedisKeys, CacheTTL } from '../../shared/utils/redis.utils';

@Injectable()
export class NotificationsCacheService {
  private readonly logger = new Logger(NotificationsCacheService.name);

  constructor(private readonly cacheManager: CacheManagerService) {}

  /**
   * Cache notification count for user
   */
  async getNotificationCount(userId: string, factory: () => Promise<number>): Promise<number> {
    return this.cacheManager.getOrSet(
      RedisKeys.notificationCount(userId),
      factory,
      CacheTTL.MEDIUM_SHORT,
    );
  }

  /**
   * Cache recent notifications for user
   */
  async getRecentNotifications(userId: string, factory: () => Promise<any[]>): Promise<any[]> {
    return this.cacheManager.getOrSet(
      RedisKeys.recentNotifications(userId),
      factory,
      CacheTTL.SHORT,
    );
  }

  /**
   * Invalidate notification count cache
   */
  async invalidateNotificationCount(userId: string): Promise<void> {
    await this.cacheManager.delete(RedisKeys.notificationCount(userId));
    this.logger.debug(`Invalidated notification count for user: ${userId}`);
  }

  /**
   * Invalidate recent notifications cache
   */
  async invalidateRecentNotifications(userId: string): Promise<void> {
    await this.cacheManager.delete(RedisKeys.recentNotifications(userId));
    this.logger.debug(`Invalidated recent notifications for user: ${userId}`);
  }

  /**
   * Invalidate all notification cache for user
   */
  async invalidateUserNotificationsCache(userId: string): Promise<void> {
    await this.cacheManager.invalidateByPrefix(`qotes:notifications:${userId}`);
    this.logger.debug(`Invalidated all notification cache for user: ${userId}`);
  }

  /**
   * Warm up notification count
   */
  async warmUpNotificationCount(userId: string, count: number): Promise<void> {
    await this.cacheManager.set(RedisKeys.notificationCount(userId), count, CacheTTL.MEDIUM_SHORT);
    this.logger.debug(`Warmed up notification count for user: ${userId}`);
  }

  /**
   * Warm up recent notifications
   */
  async warmUpRecentNotifications(userId: string, notifications: any[]): Promise<void> {
    await this.cacheManager.set(RedisKeys.recentNotifications(userId), notifications, CacheTTL.SHORT);
    this.logger.debug(`Warmed up recent notifications for user: ${userId}`);
  }
}
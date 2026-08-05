import { Injectable, Logger } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';
import { RedisKeys, CacheTTL } from '../../shared/utils/redis.utils';
import { IUser } from '../../models/user.model';

@Injectable()
export class UserCacheService {
  private readonly logger = new Logger(UserCacheService.name);

  constructor(private readonly cacheManager: CacheManagerService) { }

  /**
   * Cache user profile data
   */
  async getUserProfile(userId: string, factory: () => Promise<IUser>): Promise<IUser> {
    return this.cacheManager.getOrSet(
      RedisKeys.userProfile(userId),
      factory,
      CacheTTL.MEDIUM_LONG,
    );
  }

  /**
   * Cache user statistics
   */
  async getUserStats(userId: string, factory: () => Promise<any>): Promise<any> {
    return this.cacheManager.getOrSet(
      RedisKeys.userStats(userId),
      factory,
      CacheTTL.MEDIUM_SHORT,
    );
  }

  /**
   * Cache user's followers list
   */
  async getUserFollowers(userId: string, factory: () => Promise<string[]>): Promise<string[]> {
    return this.cacheManager.getOrSet(
      RedisKeys.userFollowers(userId),
      factory,
      CacheTTL.LONG,
    );
  }

  /**
   * Cache user's following list
   */
  async getUserFollowing(userId: string, factory: () => Promise<string[]>): Promise<string[]> {
    return this.cacheManager.getOrSet(
      RedisKeys.userFollowing(userId),
      factory,
      CacheTTL.LONG,
    );
  }

  /**
   * Cache user preferences
   */
  async getUserPreferences(userId: string, factory: () => Promise<any>): Promise<any> {
    return this.cacheManager.getOrSet(
      RedisKeys.userPreferences(userId),
      factory,
      CacheTTL.VERY_LONG,
    );
  }

  /**
   * Cache suggested users for a user
   */
  async getSuggestedUsers(userId: string, factory: () => Promise<any[]>): Promise<any[]> {
    return this.cacheManager.getOrSet(
      RedisKeys.suggestedUsers(userId),
      factory,
      CacheTTL.MEDIUM,
    );
  }

  /**
   * Invalidate all user-related cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.cacheManager.invalidateUserCache(userId);
    this.logger.debug(`Invalidated cache for user: ${userId}`);
  }

  /**
   * Warm up user cache on login
   */
  async warmUpUserCache(userId: string, data: {
    profile?: IUser;
    stats?: any;
    followers?: string[];
    following?: string[];
  }): Promise<void> {
    const promises: Promise<any>[] = [];

    if (data.profile) {
      promises.push(
        this.cacheManager.set(RedisKeys.userProfile(userId), data.profile, CacheTTL.MEDIUM_LONG)
      );
    }

    if (data.stats) {
      promises.push(
        this.cacheManager.set(RedisKeys.userStats(userId), data.stats, CacheTTL.MEDIUM_SHORT)
      );
    }

    if (data.followers) {
      promises.push(
        this.cacheManager.set(RedisKeys.userFollowers(userId), data.followers, CacheTTL.LONG)
      );
    }

    if (data.following) {
      promises.push(
        this.cacheManager.set(RedisKeys.userFollowing(userId), data.following, CacheTTL.LONG)
      );
    }

    await Promise.allSettled(promises);
    this.logger.debug(`Warmed up cache for user: ${userId}`);
  }
}
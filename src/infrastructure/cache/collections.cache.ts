import { Injectable, Logger } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';
import { RedisKeys, CacheTTL } from '../../shared/utils/redis.utils';
import { ICollection } from '../../models/collections.model';

@Injectable()
export class CollectionsCacheService {
  private readonly logger = new Logger(CollectionsCacheService.name);

  constructor(private readonly cacheManager: CacheManagerService) { }

  /**
   * Cache user's collections
   */
  async getUserCollections<T = any>(userId: string, factory: () => Promise<T>): Promise<T> {
    return this.cacheManager.getOrSet(
      RedisKeys.userCollections(userId),
      factory,
      CacheTTL.MEDIUM_LONG,
    );
  }

  /**
   * Cache collection items
   */
  async getCollectionItems<T = any>(collectionId: string, factory: () => Promise<T>): Promise<T> {
    return this.cacheManager.getOrSet(
      RedisKeys.collectionItems(collectionId),
      factory,
      CacheTTL.MEDIUM,
    );
  }

  /**
   * Invalidate user's collections cache
   */
  async invalidateUserCollectionsCache(userId: string): Promise<void> {
    await this.cacheManager.invalidateByPrefix(`qotes:collections:user:${userId}`);
    this.logger.debug(`Invalidated collections cache for user: ${userId}`);
  }

  /**
   * Invalidate collection items cache
   */
  async invalidateCollectionItemsCache(collectionId: string): Promise<void> {
    await this.cacheManager.delete(RedisKeys.collectionItems(collectionId));
    this.logger.debug(`Invalidated collection items cache: ${collectionId}`);
  }

  /**
   * Warm up user collections cache
   */
  async warmUpUserCollections(userId: string, collections: ICollection[]): Promise<void> {
    await this.cacheManager.set(RedisKeys.userCollections(userId), collections, CacheTTL.MEDIUM_LONG);
    this.logger.debug(`Warmed up collections cache for user: ${userId}`);
  }

  /**
   * Warm up collection items cache
   */
  async warmUpCollectionItems(collectionId: string, items: any[]): Promise<void> {
    await this.cacheManager.set(RedisKeys.collectionItems(collectionId), items, CacheTTL.MEDIUM);
    this.logger.debug(`Warmed up collection items cache: ${collectionId}`);
  }
}
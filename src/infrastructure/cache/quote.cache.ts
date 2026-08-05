import { Injectable, Logger } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';
import { RedisKeys, CacheTTL } from '../../shared/utils/redis.utils';
import { IQuote } from '../../models/quote.model';

@Injectable()
export class QuoteCacheService {
  private readonly logger = new Logger(QuoteCacheService.name);

  constructor(private readonly cacheManager: CacheManagerService) { }

  /**
   * Cache single quote by ID
   */
  async getQuote(quoteId: string, factory: () => Promise<IQuote>): Promise<IQuote> {
    return this.cacheManager.getOrSet(
      RedisKeys.quote(quoteId),
      factory,
      CacheTTL.LONG,
    );
  }

  /**
   * Cache quote statistics
   */
  async getQuoteStats(quoteId: string, factory: () => Promise<any>): Promise<any> {
    return this.cacheManager.getOrSet(
      RedisKeys.quoteStats(quoteId),
      factory,
      CacheTTL.MEDIUM_SHORT,
    );
  }

  /**
   * Cache user's quotes with pagination
   */
  async getUserQuotes<T = any>(userId: string, page: number, factory: () => Promise<T>): Promise<T> {
    return this.cacheManager.getOrSet(
      RedisKeys.userQuotes(userId, page),
      factory,
      CacheTTL.MEDIUM,
    );
  }

  /**
   * Cache global feed with pagination
   */
  async getGlobalFeed<T = any>(page: number, factory: () => Promise<T>): Promise<T> {
    return this.cacheManager.getOrSet(
      RedisKeys.globalFeed(page),
      factory,
      CacheTTL.MEDIUM_SHORT,
    );
  }

  /**
   * Cache following feed with pagination
   */
  async getFollowingFeed<T = any>(userId: string, page: number, factory: () => Promise<T>): Promise<T> {
    return this.cacheManager.getOrSet(
      RedisKeys.followingFeed(userId, page),
      factory,
      CacheTTL.MEDIUM_SHORT,
    );
  }

  /**
   * Cache discover feed with pagination
   */
  async getDiscoverFeed<T = any>(page: number, factory: () => Promise<T>): Promise<T> {
    return this.cacheManager.getOrSet(
      RedisKeys.discoverFeed(page),
      factory,
      CacheTTL.MEDIUM_SHORT,
    );
  }

  /**
   * Invalidate quote-specific cache
   */
  async invalidateQuoteCache(quoteId: string): Promise<void> {
    await this.cacheManager.invalidateQuoteCache(quoteId);
    this.logger.debug(`Invalidated cache for quote: ${quoteId}`);
  }

  /**
   * Invalidate user's quotes cache
   */
  async invalidateUserQuotesCache(userId: string): Promise<void> {
    await this.cacheManager.invalidateByPrefix(`qotes:user:quotes:${userId}`);
    this.logger.debug(`Invalidated quotes cache for user: ${userId}`);
  }

  /**
   * Invalidate all feed caches
   */
  async invalidateFeedCaches(): Promise<void> {
    await this.cacheManager.invalidateByPrefix('qotes:feed:global:');
    await this.cacheManager.invalidateByPrefix('qotes:feed:following:');
    await this.cacheManager.invalidateByPrefix('qotes:feed:discover:');
    this.logger.debug('Invalidated all feed caches');
  }

  /**
   * Invalidate following feed for specific user
   */
  async invalidateFollowingFeed(userId: string): Promise<void> {
    await this.cacheManager.invalidateByPrefix(`qotes:feed:following:${userId}`);
    this.logger.debug(`Invalidated following feed for user: ${userId}`);
  }

  /**
   * Warm up quote cache after creation/update
   */
  async warmUpQuoteCache(quote: IQuote): Promise<void> {
    await this.cacheManager.set(RedisKeys.quote(quote._id.toString()), quote, CacheTTL.LONG);
    this.logger.debug(`Warmed up cache for quote: ${quote._id}`);
  }

  /**
   * Batch warm up quotes
   */
  async warmUpQuotesCache(quotes: IQuote[]): Promise<void> {
    const promises = quotes.map(quote =>
      this.warmUpQuoteCache(quote)
    );
    await Promise.allSettled(promises);
    this.logger.debug(`Warmed up cache for ${quotes.length} quotes`);
  }
}
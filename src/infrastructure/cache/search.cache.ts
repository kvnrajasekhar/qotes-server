import { Injectable, Logger } from '@nestjs/common';
import { CacheManagerService } from './cache-manager.service';
import { RedisKeys, CacheTTL } from '../../shared/utils/redis.utils';

@Injectable()
export class SearchCacheService {
  private readonly logger = new Logger(SearchCacheService.name);

  constructor(private readonly cacheManager: CacheManagerService) { }

  /**
   * Cache search results for users
   */
  async getUserSearchResults<T = any>(query: string, factory: () => Promise<T>): Promise<T> {
    return this.cacheManager.getOrSet(
      RedisKeys.searchResults(query, 'users'),
      factory,
      CacheTTL.SHORT,
    );
  }

  /**
   * Cache search results for quotes
   */
  async getQuoteSearchResults<T = any>(query: string, factory: () => Promise<T>): Promise<T> {
    return this.cacheManager.getOrSet(
      RedisKeys.searchResults(query, 'quotes'),
      factory,
      CacheTTL.SHORT,
    );
  }

  /**
   * Cache search results for hashtags
   */
  async getHashtagSearchResults<T = any>(query: string, factory: () => Promise<T>): Promise<T> {
    return this.cacheManager.getOrSet(
      RedisKeys.searchResults(query, 'hashtags'),
      factory,
      CacheTTL.SHORT,
    );
  }

  /**
   * Cache global search results
   */
  async getGlobalSearchResults<T = any>(query: string, factory: () => Promise<T>): Promise<T> {
    return this.cacheManager.getOrSet(
      RedisKeys.searchResults(query, 'global'),
      factory,
      CacheTTL.SHORT,
    );
  }

  /**
   * Cache trending hashtags
   */
  async getTrendingHashtags(factory: () => Promise<any[]>): Promise<any[]> {
    return this.cacheManager.getOrSet(
      RedisKeys.trendingHashtags(),
      factory,
      CacheTTL.MEDIUM_SHORT,
    );
  }

  /**
   * Invalidate search results for a specific query
   */
  async invalidateSearchResults(query: string): Promise<void> {
    await this.cacheManager.invalidateByPrefix(`qotes:search:${query}`);
    this.logger.debug(`Invalidated search results for query: ${query}`);
  }

  /**
   * Invalidate all search cache
   */
  async invalidateAllSearchCache(): Promise<void> {
    await this.cacheManager.invalidateByPrefix('qotes:search:');
    this.logger.debug('Invalidated all search cache');
  }

  /**
   * Invalidate trending hashtags cache
   */
  async invalidateTrendingHashtags(): Promise<void> {
    await this.cacheManager.delete(RedisKeys.trendingHashtags());
    this.logger.debug('Invalidated trending hashtags cache');
  }

  /**
   * Warm up trending hashtags cache
   */
  async warmUpTrendingHashtags(hashtags: any[]): Promise<void> {
    await this.cacheManager.set(RedisKeys.trendingHashtags(), hashtags, CacheTTL.MEDIUM_SHORT);
    this.logger.debug('Warmed up trending hashtags cache');
  }
}
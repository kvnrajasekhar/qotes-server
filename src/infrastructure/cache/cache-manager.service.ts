import { Injectable, Logger } from '@nestjs/common';
import {
  redis,
  RedisKeys,
  cacheGetTyped,
  cacheSetTyped,
  cacheGetOrSet,
  cacheDelPattern,
  cacheDel,
  cacheExists,
  cacheExpire,
  cacheTTL,
  CacheTTL,
} from '../../shared/utils/redis.utils';

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalOperations: number;
}

@Injectable()
export class CacheManagerService {
  private readonly logger = new Logger(CacheManagerService.name);
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalOperations: 0,
  };

  /**
   * Get cached value with automatic deserialization
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await cacheGetTyped<T>(key);
      if (value !== null) {
        this.recordHit();
      } else {
        this.recordMiss();
      }
      return value;
    } catch (error) {
      this.logger.error(`Failed to get cache key: ${key}`, error);
      this.recordMiss();
      return null;
    }
  }

  /**
   * Set cached value with automatic serialization
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const result = await cacheSetTyped(key, value, ttl);
      this.logger.debug(`Cache set: ${key}, TTL: ${ttl || 'default'}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to set cache key: ${key}`, error);
      return false;
    }
  }

  /**
   * Get from cache or set using factory function (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    try {
      return await cacheGetOrSet(key, factory, ttl);
    } catch (error) {
      this.logger.error(`Failed to getOrSet cache key: ${key}`, error);
      // Fallback to factory directly
      return await factory();
    }
  }

  /**
   * Delete specific cache key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await cacheDel(key);
      const success = result !== null && result > 0;
      this.logger.debug(`Cache delete: ${key}, success: ${success}`);
      return success;
    } catch (error) {
      this.logger.error(`Failed to delete cache key: ${key}`, error);
      return false;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const result = await cacheDelPattern(pattern);
      this.logger.debug(`Cache pattern invalidation: ${pattern}, deleted: ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to invalidate pattern: ${pattern}`, error);
      return 0;
    }
  }

  /**
   * Delete all keys with a specific prefix
   */
  async invalidateByPrefix(prefix: string): Promise<number> {
    const pattern = `${prefix}*`;
    return await this.invalidatePattern(pattern);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await cacheExists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check cache key existence: ${key}`, error);
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      return await cacheExpire(key, ttl);
    } catch (error) {
      this.logger.error(`Failed to set TTL for key: ${key}`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for key
   */
  async getTTL(key: string): Promise<number> {
    try {
      return await cacheTTL(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL for key: ${key}`, error);
      return -1;
    }
  }

  /**
   * Warm up cache for a specific key
   */
  async warmUpKey(
    key: string,
    factory: () => Promise<any>,
    ttl?: number,
  ): Promise<void> {
    try {
      const data = await factory();
      await this.set(key, data, ttl);
      this.logger.debug(`Cache warmed up: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to warm up cache key: ${key}`, error);
    }
  }

  /**
   * Warm up multiple keys with their factory functions
   */
  async warmUpPattern(
    pattern: string,
    factoryMap: Map<string, () => Promise<any>>,
    ttl?: number,
  ): Promise<void> {
    const promises = Array.from(factoryMap.entries()).map(
      async ([key, factory]) => {
        if (key.match(pattern)) {
          await this.warmUpKey(key, factory, ttl);
        }
      },
    );

    await Promise.allSettled(promises);
    this.logger.debug(`Cache pattern warm-up completed: ${pattern}`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const hitRate = this.stats.totalOperations > 0
      ? (this.stats.hits / this.stats.totalOperations) * 100
      : 0;

    return {
      ...this.stats,
      hitRate,
    };
  }

  /**
   * Get current hit rate
   */
  async hitRate(): Promise<number> {
    const stats = await this.getStats();
    return stats.hitRate;
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalOperations: 0,
    };
    this.logger.debug('Cache statistics reset');
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return false;
    }
  }

  /**
   * Get Redis information
   */
  async getRedisInfo(): Promise<any> {
    try {
      const info = await redis.info();
      const dbSize = await redis.dbsize();
      const memory = await redis.info('memory');
      
      return {
        connected: true,
        info,
        dbSize,
        memory,
      };
    } catch (error) {
      this.logger.error('Failed to get Redis info', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Record cache hit
   */
  private recordHit(): void {
    this.stats.hits++;
    this.stats.totalOperations++;
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    this.stats.misses++;
    this.stats.totalOperations++;
  }

  /**
   * Convenience method for user profile caching
   */
  async getUserProfile(userId: string): Promise<any> {
    return this.getOrSet(
      RedisKeys.userProfile(userId),
      async () => {
        // This will be implemented by the service
        return null;
      },
      CacheTTL.MEDIUM_LONG,
    );
  }

  /**
   * Convenience method for user stats caching
   */
  async getUserStats(userId: string): Promise<any> {
    return this.getOrSet(
      RedisKeys.userStats(userId),
      async () => {
        // This will be implemented by the service
        return null;
      },
      CacheTTL.MEDIUM_SHORT,
    );
  }

  /**
   * Convenience method for quote caching
   */
  async getQuote(quoteId: string): Promise<any> {
    return this.getOrSet(
      RedisKeys.quote(quoteId),
      async () => {
        // This will be implemented by the service
        return null;
      },
      CacheTTL.LONG,
    );
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidateByPrefix(`qotes:user:${userId}`);
    await this.invalidateByPrefix(`qotes:feed:following:${userId}`);
    await this.invalidateByPrefix(`qotes:user:quotes:${userId}`);
    await this.invalidateByPrefix(`qotes:collections:user:${userId}`);
    await this.invalidateByPrefix(`qotes:notifications:count:${userId}`);
    await this.invalidateByPrefix(`qotes:notifications:recent:${userId}`);
  }

  /**
   * Invalidate quote-related cache
   */
  async invalidateQuoteCache(quoteId: string): Promise<void> {
    await this.invalidateByPrefix(`qotes:quote:${quoteId}`);
    await this.invalidateByPrefix(`qotes:reactions:${quoteId}`);
    await this.invalidateByPrefix(`qotes:comments:${quoteId}`);
    // Invalidate all feeds as they might contain this quote
    await this.invalidateByPrefix('qotes:feed:global:');
    await this.invalidateByPrefix('qotes:feed:discover:');
  }

  /**
   * Invalidate social-related cache
   */
  async invalidateSocialCache(userId: string): Promise<void> {
    await this.invalidateByPrefix(`qotes:social:following:${userId}`);
    await this.invalidateByPrefix(`qotes:social:suggested:${userId}`);
    await this.invalidateByPrefix(`qotes:feed:following:${userId}`);
  }
}
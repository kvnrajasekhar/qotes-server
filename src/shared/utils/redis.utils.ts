import Redis from "ioredis";
import dotenv from "dotenv";
import logger from "./logger.util";

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times: number) {
    return Math.min(times * 50, 2000);
  },
});

redis.on("connect", () => {
  logger.info("Redis connected", {
    service: "redis",
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
  });
});

redis.on("ready", () => {
  logger.info("Redis ready to accept commands", {
    service: "redis",
  });
});

redis.on("error", (error: Error) => {
  logger.error("Redis connection error", {
    service: "redis",
    error,
  });
});

redis.on("reconnecting", (delay: number) => {
  logger.warn("Redis reconnecting", {
    service: "redis",
    delay,
  });
});

// Serialization helpers
const serialize = (value: any): string => {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

const deserialize = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
};

// Generic cache operations with automatic serialization
const cacheGetTyped = async <T>(key: string): Promise<T | null> => {
  try {
    const value = await redis.get(key);
    logger.debug("Redis cache lookup", {
      service: "redis",
      operation: "getTyped",
      key,
      hit: value !== null,
    });
    return deserialize<T>(value);
  } catch (error) {
    logger.error("Redis cache get typed failed", {
      service: "redis",
      operation: "getTyped",
      key,
      error,
    });
    return null;
  }
};

const cacheSetTyped = async <T>(
  key: string,
  value: T,
  ttlSeconds?: number,
): Promise<boolean> => {
  try {
    const serialized = serialize(value);
    const result = ttlSeconds
      ? await redis.set(key, serialized, "EX", ttlSeconds)
      : await redis.set(key, serialized);
    logger.debug("Redis cache write", {
      service: "redis",
      operation: "setTyped",
      key,
      ttlSeconds,
      result,
    });
    return result === "OK";
  } catch (error) {
    logger.error("Redis cache set typed failed", {
      service: "redis",
      operation: "setTyped",
      key,
      ttlSeconds,
      error,
    });
    return false;
  }
};

const cacheGetOrSet = async <T>(
  key: string,
  factory: () => Promise<T>,
  ttlSeconds?: number,
): Promise<T> => {
  try {
    const cached = await cacheGetTyped<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    await cacheSetTyped(key, value, ttlSeconds);
    return value;
  } catch (error) {
    logger.error("Redis cache getOrSet failed", {
      service: "redis",
      operation: "getOrSet",
      key,
      error,
    });
    // Return factory result as fallback
    return await factory();
  }
};

const cacheDelPattern = async (pattern: string): Promise<number> => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    
    const result = await redis.del(...keys);
    logger.debug("Redis cache pattern delete", {
      service: "redis",
      operation: "delPattern",
      pattern,
      keysCount: keys.length,
      result,
    });
    return result;
  } catch (error) {
    logger.error("Redis cache del pattern failed", {
      service: "redis",
      operation: "delPattern",
      pattern,
      error,
    });
    return 0;
  }
};

const cacheExpire = async (key: string, ttlSeconds: number): Promise<boolean> => {
  try {
    const result = await redis.expire(key, ttlSeconds);
    logger.debug("Redis cache expire", {
      service: "redis",
      operation: "expire",
      key,
      ttlSeconds,
      result,
    });
    return result === 1;
  } catch (error) {
    logger.error("Redis cache expire failed", {
      service: "redis",
      operation: "expire",
      key,
      ttlSeconds,
      error,
    });
    return false;
  }
};

const cacheTTL = async (key: string): Promise<number> => {
  try {
    const ttl = await redis.ttl(key);
    logger.debug("Redis cache TTL check", {
      service: "redis",
      operation: "ttl",
      key,
      ttl,
    });
    return ttl;
  } catch (error) {
    logger.error("Redis cache TTL check failed", {
      service: "redis",
      operation: "ttl",
      key,
      error,
    });
    return -1;
  }
};

// Hash operations with typing
const cacheHGetTyped = async <T>(key: string, field: string): Promise<T | null> => {
  try {
    const value = await redis.hget(key, field);
    logger.debug("Redis cache hget", {
      service: "redis",
      operation: "hgetTyped",
      key,
      field,
      hit: value !== null,
    });
    return deserialize<T>(value);
  } catch (error) {
    logger.error("Redis cache hget typed failed", {
      service: "redis",
      operation: "hgetTyped",
      key,
      field,
      error,
    });
    return null;
  }
};

const cacheHSetTyped = async <T>(key: string, field: string, value: T): Promise<boolean> => {
  try {
    const serialized = serialize(value);
    const result = await redis.hset(key, field, serialized);
    logger.debug("Redis cache hset", {
      service: "redis",
      operation: "hsetTyped",
      key,
      field,
      result,
    });
    return result >= 0;
  } catch (error) {
    logger.error("Redis cache hset typed failed", {
      service: "redis",
      operation: "hsetTyped",
      key,
      field,
      error,
    });
    return false;
  }
};

const cacheHGetAllTyped = async <T>(key: string): Promise<Record<string, T>> => {
  try {
    const value = await redis.hgetall(key);
    const result: Record<string, T> = {};
    
    for (const [field, val] of Object.entries(value)) {
      result[field] = deserialize<T>(val);
    }
    
    const hit = Object.keys(result).length > 0;
    logger.debug("Redis cache hgetall", {
      service: "redis",
      operation: "hgetallTyped",
      key,
      hit,
    });
    return result;
  } catch (error) {
    logger.error("Redis cache hgetall typed failed", {
      service: "redis",
      operation: "hgetallTyped",
      key,
      error,
    });
    return {};
  }
};

const cacheHDel = async (key: string, ...fields: string[]): Promise<number> => {
  try {
    const result = await redis.hdel(key, ...fields);
    logger.debug("Redis cache hdel", {
      service: "redis",
      operation: "hdel",
      key,
      fields,
      result,
    });
    return result;
  } catch (error) {
    logger.error("Redis cache hdel failed", {
      service: "redis",
      operation: "hdel",
      key,
      fields,
      error,
    });
    return 0;
  }
};

// Set operations
const cacheSAdd = async (key: string, ...members: string[]): Promise<number> => {
  try {
    const result = await redis.sadd(key, ...members);
    logger.debug("Redis cache sadd", {
      service: "redis",
      operation: "sadd",
      key,
      membersCount: members.length,
      result,
    });
    return result;
  } catch (error) {
    logger.error("Redis cache sadd failed", {
      service: "redis",
      operation: "sadd",
      key,
      error,
    });
    return 0;
  }
};

const cacheSRem = async (key: string, ...members: string[]): Promise<number> => {
  try {
    const result = await redis.srem(key, ...members);
    logger.debug("Redis cache srem", {
      service: "redis",
      operation: "srem",
      key,
      membersCount: members.length,
      result,
    });
    return result;
  } catch (error) {
    logger.error("Redis cache srem failed", {
      service: "redis",
      operation: "srem",
      key,
      error,
    });
    return 0;
  }
};

const cacheSMembers = async (key: string): Promise<string[]> => {
  try {
    const result = await redis.smembers(key);
    logger.debug("Redis cache smembers", {
      service: "redis",
      operation: "smembers",
      key,
      count: result.length,
    });
    return result;
  } catch (error) {
    logger.error("Redis cache smembers failed", {
      service: "redis",
      operation: "smembers",
      key,
      error,
    });
    return [];
  }
};

const cacheSIsMember = async (key: string, member: string): Promise<boolean> => {
  try {
    const result = await redis.sismember(key, member);
    logger.debug("Redis cache sismember", {
      service: "redis",
      operation: "sismember",
      key,
      member,
      isMember: result === 1,
    });
    return result === 1;
  } catch (error) {
    logger.error("Redis cache sismember failed", {
      service: "redis",
      operation: "sismember",
      key,
      member,
      error,
    });
    return false;
  }
};

// Sorted set operations
const cacheZAdd = async (key: string, score: number, member: string): Promise<number> => {
  try {
    const result = await redis.zadd(key, score, member);
    logger.debug("Redis cache zadd", {
      service: "redis",
      operation: "zadd",
      key,
      score,
      member,
      result,
    });
    return result;
  } catch (error) {
    logger.error("Redis cache zadd failed", {
      service: "redis",
      operation: "zadd",
      key,
      error,
    });
    return 0;
  }
};

const cacheZRem = async (key: string, ...members: string[]): Promise<number> => {
  try {
    const result = await redis.zrem(key, ...members);
    logger.debug("Redis cache zrem", {
      service: "redis",
      operation: "zrem",
      key,
      membersCount: members.length,
      result,
    });
    return result;
  } catch (error) {
    logger.error("Redis cache zrem failed", {
      service: "redis",
      operation: "zrem",
      key,
      error,
    });
    return 0;
  }
};

const cacheZRange = async (key: string, start: number, end: number): Promise<string[]> => {
  try {
    const result = await redis.zrange(key, start, end);
    logger.debug("Redis cache zrange", {
      service: "redis",
      operation: "zrange",
      key,
      start,
      end,
      count: result.length,
    });
    return result;
  } catch (error) {
    logger.error("Redis cache zrange failed", {
      service: "redis",
      operation: "zrange",
      key,
      error,
    });
    return [];
  }
};

const cacheZRevRange = async (key: string, start: number, end: number): Promise<string[]> => {
  try {
    const result = await redis.zrevrange(key, start, end);
    logger.debug("Redis cache zrevrange", {
      service: "redis",
      operation: "zrevrange",
      key,
      start,
      end,
      count: result.length,
    });
    return result;
  } catch (error) {
    logger.error("Redis cache zrevrange failed", {
      service: "redis",
      operation: "zrevrange",
      key,
      error,
    });
    return [];
  }
};

// TTL configuration constants
const CacheTTL = {
  VERY_SHORT: 60,        // 1 minute
  SHORT: 120,            // 2 minutes
  MEDIUM_SHORT: 300,     // 5 minutes
  MEDIUM: 600,           // 10 minutes
  MEDIUM_LONG: 900,      // 15 minutes
  LONG: 1800,            // 30 minutes
  VERY_LONG: 3600,       // 1 hour
  EXTENDED: 86400,       // 24 hours
} as const;

const cacheGet = async (key: string): Promise<string | null> => {
  try {
    const value = await redis.get(key);
    logger.debug("Redis cache lookup", {
      service: "redis",
      operation: "get",
      key,
      hit: value !== null,
    });
    return value;
  } catch (error) {
    logger.error("Redis cache get failed", {
      service: "redis",
      operation: "get",
      key,
      error,
    });
    return null;
  }
};

const cacheSet = async (
  key: string,
  value: string,
  ttlSeconds?: number,
): Promise<"OK" | null> => {
  try {
    const result = ttlSeconds
      ? await redis.set(key, value, "EX", ttlSeconds)
      : await redis.set(key, value);
    logger.debug("Redis cache write", {
      service: "redis",
      operation: "set",
      key,
      ttlSeconds,
      result,
    });
    return result;
  } catch (error) {
    logger.error("Redis cache set failed", {
      service: "redis",
      operation: "set",
      key,
      ttlSeconds,
      error,
    });
    return null;
  }
};

const cacheHGetAll = async (key: string): Promise<Record<string, string>> => {
  try {
    const value = await redis.hgetall(key);
    const hit = Object.keys(value || {}).length > 0;
    logger.debug("Redis cache lookup", {
      service: "redis",
      operation: "hgetall",
      key,
      hit,
    });
    return value;
  } catch (error) {
    logger.error("Redis cache hgetall failed", {
      service: "redis",
      operation: "hgetall",
      key,
      error,
    });
    return {};
  }
};

const cacheDel = async (key: string): Promise<number | null> => {
  try {
    const result = await redis.del(key);
    logger.debug("Redis cache delete", {
      service: "redis",
      operation: "del",
      key,
      result,
    });
    return result;
  } catch (error) {
    logger.error("Redis cache delete failed", {
      service: "redis",
      operation: "del",
      key,
      error,
    });
    return null;
  }
};

const cacheExists = async (key: string): Promise<number> => {
  try {
    const result = await redis.exists(key);
    logger.debug("Redis cache exists check", {
      service: "redis",
      operation: "exists",
      key,
      exists: Boolean(result),
    });
    return result;
  } catch (error) {
    logger.error("Redis cache exists check failed", {
      service: "redis",
      operation: "exists",
      key,
      error,
    });
    return 0;
  }
};

const RedisKeys = {
  reactionBreakdown: (id: string) => `qotes:reaction:breakdown:${id}`,
  reactionTotal: (id: string) => `qotes:reaction:total:${id}`,
  reactionState: (userId: string, quoteId: string) =>
    `qotes:reaction:state:${userId}:${quoteId}`,
  rateLimitBurst: (userId: string) => `qotes:ratelimit:burst:${userId}`,
  rateLimitSustain: (userId: string) => `qotes:ratelimit:sustain:${userId}`,
  userFollowing: (userId: string) => `qotes:social:following:${userId}`,
  firstPageReactions: (quoteId: string, viewerId: string) =>
    `qotes:cache:reactions:p1:${quoteId}:${viewerId}`,
  
  // User related keys
  user: (userId: string) => `qotes:user:${userId}`,
  userProfile: (userId: string) => `qotes:user:profile:${userId}`,
  userStats: (userId: string) => `qotes:user:stats:${userId}`,
  userFollowers: (userId: string) => `qotes:user:followers:${userId}`,
  userPreferences: (userId: string) => `qotes:user:preferences:${userId}`,
  
  // Quote related keys
  quote: (quoteId: string) => `qotes:quote:${quoteId}`,
  quoteStats: (quoteId: string) => `qotes:quote:stats:${quoteId}`,
  userQuotes: (userId: string, page: number) => `qotes:user:quotes:${userId}:${page}`,
  
  // Feed related keys
  globalFeed: (page: number) => `qotes:feed:global:${page}`,
  followingFeed: (userId: string, page: number) => `qotes:feed:following:${userId}:${page}`,
  discoverFeed: (page: number) => `qotes:feed:discover:${page}`,
  
  // Social related keys
  comments: (quoteId: string) => `qotes:comments:${quoteId}`,
  suggestedUsers: (userId: string) => `qotes:social:suggested:${userId}`,
  
  // Search related keys
  searchResults: (query: string, type: string) => `qotes:search:${type}:${hashString(query)}`,
  trendingHashtags: () => `qotes:trending:hashtags`,
  
  // Collection related keys
  userCollections: (userId: string) => `qotes:collections:user:${userId}`,
  collectionItems: (collectionId: string) => `qotes:collections:items:${collectionId}`,
  
  // Notification related keys
  notificationCount: (userId: string) => `qotes:notifications:count:${userId}`,
  recentNotifications: (userId: string) => `qotes:notifications:recent:${userId}`,
};

// Simple hash function for query strings
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

redis.defineCommand("updateReaction", {
  numberOfKeys: 2,
  lua: `
    local breakdownKey = KEYS[1]
    local totalKey = KEYS[2]
    local type = ARGV[1]
    local delta = tonumber(ARGV[2])
    local oldType = ARGV[3]

    if oldType ~= "none" then
      redis.call("HINCRBY", breakdownKey, oldType, -1)
    else
      redis.call("INCRBY", totalKey, delta)
    end
    return redis.call("HINCRBY", breakdownKey, type, delta)
  `,
});

redis.defineCommand("slidingWindowRateLimit", {
  numberOfKeys: 2,
  lua: `
    local now = tonumber(ARGV[1])
    -- Burst window
    redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - ARGV[2])
    local burstCount = redis.call('ZCARD', KEYS[1])
    if burstCount >= tonumber(ARGV[3]) then return 0 end

    -- Sustained window
    redis.call('ZREMRANGEBYSCORE', KEYS[2], 0, now - ARGV[4])
    local sustainedCount = redis.call('ZCARD', KEYS[2])
    if sustainedCount >= tonumber(ARGV[5]) then return 0 end

    -- Record event in both windows
    redis.call('ZADD', KEYS[1], now, now)
    redis.call('ZADD', KEYS[2], now, now)

    -- Expiry (auto cleanup)
    redis.call('PEXPIRE', KEYS[1], ARGV[2])
    redis.call('PEXPIRE', KEYS[2], ARGV[4])
    return 1
  `,
});

export {
  redis,
  RedisKeys,
  cacheGet,
  cacheSet,
  cacheHGetAll,
  cacheDel,
  cacheExists,
  // New typed cache operations
  cacheGetTyped,
  cacheSetTyped,
  cacheGetOrSet,
  cacheDelPattern,
  cacheExpire,
  cacheTTL,
  // Hash operations
  cacheHGetTyped,
  cacheHSetTyped,
  cacheHGetAllTyped,
  cacheHDel,
  // Set operations
  cacheSAdd,
  cacheSRem,
  cacheSMembers,
  cacheSIsMember,
  // Sorted set operations
  cacheZAdd,
  cacheZRem,
  cacheZRange,
  cacheZRevRange,
  // TTL configuration
  CacheTTL,
};

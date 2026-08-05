"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheTTL = exports.cacheZRevRange = exports.cacheZRange = exports.cacheZRem = exports.cacheZAdd = exports.cacheSIsMember = exports.cacheSMembers = exports.cacheSRem = exports.cacheSAdd = exports.cacheHDel = exports.cacheHGetAllTyped = exports.cacheHSetTyped = exports.cacheHGetTyped = exports.cacheTTL = exports.cacheExpire = exports.cacheDelPattern = exports.cacheGetOrSet = exports.cacheSetTyped = exports.cacheGetTyped = exports.cacheExists = exports.cacheDel = exports.cacheHGetAll = exports.cacheSet = exports.cacheGet = exports.RedisKeys = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_util_1 = __importDefault(require("./logger.util"));
dotenv_1.default.config();
const redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times) {
        return Math.min(times * 50, 2000);
    },
});
exports.redis = redis;
redis.on("connect", () => {
    logger_util_1.default.info("Redis connected", {
        service: "redis",
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
    });
});
redis.on("ready", () => {
    logger_util_1.default.info("Redis ready to accept commands", {
        service: "redis",
    });
});
redis.on("error", (error) => {
    logger_util_1.default.error("Redis connection error", {
        service: "redis",
        error,
    });
});
redis.on("reconnecting", (delay) => {
    logger_util_1.default.warn("Redis reconnecting", {
        service: "redis",
        delay,
    });
});
const serialize = (value) => {
    if (typeof value === 'string')
        return value;
    return JSON.stringify(value);
};
const deserialize = (value) => {
    if (!value)
        return null;
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
};
const cacheGetTyped = async (key) => {
    try {
        const value = await redis.get(key);
        logger_util_1.default.debug("Redis cache lookup", {
            service: "redis",
            operation: "getTyped",
            key,
            hit: value !== null,
        });
        return deserialize(value);
    }
    catch (error) {
        logger_util_1.default.error("Redis cache get typed failed", {
            service: "redis",
            operation: "getTyped",
            key,
            error,
        });
        return null;
    }
};
exports.cacheGetTyped = cacheGetTyped;
const cacheSetTyped = async (key, value, ttlSeconds) => {
    try {
        const serialized = serialize(value);
        const result = ttlSeconds
            ? await redis.set(key, serialized, "EX", ttlSeconds)
            : await redis.set(key, serialized);
        logger_util_1.default.debug("Redis cache write", {
            service: "redis",
            operation: "setTyped",
            key,
            ttlSeconds,
            result,
        });
        return result === "OK";
    }
    catch (error) {
        logger_util_1.default.error("Redis cache set typed failed", {
            service: "redis",
            operation: "setTyped",
            key,
            ttlSeconds,
            error,
        });
        return false;
    }
};
exports.cacheSetTyped = cacheSetTyped;
const cacheGetOrSet = async (key, factory, ttlSeconds) => {
    try {
        const cached = await cacheGetTyped(key);
        if (cached !== null) {
            return cached;
        }
        const value = await factory();
        await cacheSetTyped(key, value, ttlSeconds);
        return value;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache getOrSet failed", {
            service: "redis",
            operation: "getOrSet",
            key,
            error,
        });
        return await factory();
    }
};
exports.cacheGetOrSet = cacheGetOrSet;
const cacheDelPattern = async (pattern) => {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length === 0)
            return 0;
        const result = await redis.del(...keys);
        logger_util_1.default.debug("Redis cache pattern delete", {
            service: "redis",
            operation: "delPattern",
            pattern,
            keysCount: keys.length,
            result,
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache del pattern failed", {
            service: "redis",
            operation: "delPattern",
            pattern,
            error,
        });
        return 0;
    }
};
exports.cacheDelPattern = cacheDelPattern;
const cacheExpire = async (key, ttlSeconds) => {
    try {
        const result = await redis.expire(key, ttlSeconds);
        logger_util_1.default.debug("Redis cache expire", {
            service: "redis",
            operation: "expire",
            key,
            ttlSeconds,
            result,
        });
        return result === 1;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache expire failed", {
            service: "redis",
            operation: "expire",
            key,
            ttlSeconds,
            error,
        });
        return false;
    }
};
exports.cacheExpire = cacheExpire;
const cacheTTL = async (key) => {
    try {
        const ttl = await redis.ttl(key);
        logger_util_1.default.debug("Redis cache TTL check", {
            service: "redis",
            operation: "ttl",
            key,
            ttl,
        });
        return ttl;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache TTL check failed", {
            service: "redis",
            operation: "ttl",
            key,
            error,
        });
        return -1;
    }
};
exports.cacheTTL = cacheTTL;
const cacheHGetTyped = async (key, field) => {
    try {
        const value = await redis.hget(key, field);
        logger_util_1.default.debug("Redis cache hget", {
            service: "redis",
            operation: "hgetTyped",
            key,
            field,
            hit: value !== null,
        });
        return deserialize(value);
    }
    catch (error) {
        logger_util_1.default.error("Redis cache hget typed failed", {
            service: "redis",
            operation: "hgetTyped",
            key,
            field,
            error,
        });
        return null;
    }
};
exports.cacheHGetTyped = cacheHGetTyped;
const cacheHSetTyped = async (key, field, value) => {
    try {
        const serialized = serialize(value);
        const result = await redis.hset(key, field, serialized);
        logger_util_1.default.debug("Redis cache hset", {
            service: "redis",
            operation: "hsetTyped",
            key,
            field,
            result,
        });
        return result >= 0;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache hset typed failed", {
            service: "redis",
            operation: "hsetTyped",
            key,
            field,
            error,
        });
        return false;
    }
};
exports.cacheHSetTyped = cacheHSetTyped;
const cacheHGetAllTyped = async (key) => {
    try {
        const value = await redis.hgetall(key);
        const result = {};
        for (const [field, val] of Object.entries(value)) {
            result[field] = deserialize(val);
        }
        const hit = Object.keys(result).length > 0;
        logger_util_1.default.debug("Redis cache hgetall", {
            service: "redis",
            operation: "hgetallTyped",
            key,
            hit,
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache hgetall typed failed", {
            service: "redis",
            operation: "hgetallTyped",
            key,
            error,
        });
        return {};
    }
};
exports.cacheHGetAllTyped = cacheHGetAllTyped;
const cacheHDel = async (key, ...fields) => {
    try {
        const result = await redis.hdel(key, ...fields);
        logger_util_1.default.debug("Redis cache hdel", {
            service: "redis",
            operation: "hdel",
            key,
            fields,
            result,
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache hdel failed", {
            service: "redis",
            operation: "hdel",
            key,
            fields,
            error,
        });
        return 0;
    }
};
exports.cacheHDel = cacheHDel;
const cacheSAdd = async (key, ...members) => {
    try {
        const result = await redis.sadd(key, ...members);
        logger_util_1.default.debug("Redis cache sadd", {
            service: "redis",
            operation: "sadd",
            key,
            membersCount: members.length,
            result,
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache sadd failed", {
            service: "redis",
            operation: "sadd",
            key,
            error,
        });
        return 0;
    }
};
exports.cacheSAdd = cacheSAdd;
const cacheSRem = async (key, ...members) => {
    try {
        const result = await redis.srem(key, ...members);
        logger_util_1.default.debug("Redis cache srem", {
            service: "redis",
            operation: "srem",
            key,
            membersCount: members.length,
            result,
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache srem failed", {
            service: "redis",
            operation: "srem",
            key,
            error,
        });
        return 0;
    }
};
exports.cacheSRem = cacheSRem;
const cacheSMembers = async (key) => {
    try {
        const result = await redis.smembers(key);
        logger_util_1.default.debug("Redis cache smembers", {
            service: "redis",
            operation: "smembers",
            key,
            count: result.length,
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache smembers failed", {
            service: "redis",
            operation: "smembers",
            key,
            error,
        });
        return [];
    }
};
exports.cacheSMembers = cacheSMembers;
const cacheSIsMember = async (key, member) => {
    try {
        const result = await redis.sismember(key, member);
        logger_util_1.default.debug("Redis cache sismember", {
            service: "redis",
            operation: "sismember",
            key,
            member,
            isMember: result === 1,
        });
        return result === 1;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache sismember failed", {
            service: "redis",
            operation: "sismember",
            key,
            member,
            error,
        });
        return false;
    }
};
exports.cacheSIsMember = cacheSIsMember;
const cacheZAdd = async (key, score, member) => {
    try {
        const result = await redis.zadd(key, score, member);
        logger_util_1.default.debug("Redis cache zadd", {
            service: "redis",
            operation: "zadd",
            key,
            score,
            member,
            result,
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache zadd failed", {
            service: "redis",
            operation: "zadd",
            key,
            error,
        });
        return 0;
    }
};
exports.cacheZAdd = cacheZAdd;
const cacheZRem = async (key, ...members) => {
    try {
        const result = await redis.zrem(key, ...members);
        logger_util_1.default.debug("Redis cache zrem", {
            service: "redis",
            operation: "zrem",
            key,
            membersCount: members.length,
            result,
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache zrem failed", {
            service: "redis",
            operation: "zrem",
            key,
            error,
        });
        return 0;
    }
};
exports.cacheZRem = cacheZRem;
const cacheZRange = async (key, start, end) => {
    try {
        const result = await redis.zrange(key, start, end);
        logger_util_1.default.debug("Redis cache zrange", {
            service: "redis",
            operation: "zrange",
            key,
            start,
            end,
            count: result.length,
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache zrange failed", {
            service: "redis",
            operation: "zrange",
            key,
            error,
        });
        return [];
    }
};
exports.cacheZRange = cacheZRange;
const cacheZRevRange = async (key, start, end) => {
    try {
        const result = await redis.zrevrange(key, start, end);
        logger_util_1.default.debug("Redis cache zrevrange", {
            service: "redis",
            operation: "zrevrange",
            key,
            start,
            end,
            count: result.length,
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache zrevrange failed", {
            service: "redis",
            operation: "zrevrange",
            key,
            error,
        });
        return [];
    }
};
exports.cacheZRevRange = cacheZRevRange;
const CacheTTL = {
    VERY_SHORT: 60,
    SHORT: 120,
    MEDIUM_SHORT: 300,
    MEDIUM: 600,
    MEDIUM_LONG: 900,
    LONG: 1800,
    VERY_LONG: 3600,
    EXTENDED: 86400,
};
exports.CacheTTL = CacheTTL;
const cacheGet = async (key) => {
    try {
        const value = await redis.get(key);
        logger_util_1.default.debug("Redis cache lookup", {
            service: "redis",
            operation: "get",
            key,
            hit: value !== null,
        });
        return value;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache get failed", {
            service: "redis",
            operation: "get",
            key,
            error,
        });
        return null;
    }
};
exports.cacheGet = cacheGet;
const cacheSet = async (key, value, ttlSeconds) => {
    try {
        const result = ttlSeconds
            ? await redis.set(key, value, "EX", ttlSeconds)
            : await redis.set(key, value);
        logger_util_1.default.debug("Redis cache write", {
            service: "redis",
            operation: "set",
            key,
            ttlSeconds,
            result,
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache set failed", {
            service: "redis",
            operation: "set",
            key,
            ttlSeconds,
            error,
        });
        return null;
    }
};
exports.cacheSet = cacheSet;
const cacheHGetAll = async (key) => {
    try {
        const value = await redis.hgetall(key);
        const hit = Object.keys(value || {}).length > 0;
        logger_util_1.default.debug("Redis cache lookup", {
            service: "redis",
            operation: "hgetall",
            key,
            hit,
        });
        return value;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache hgetall failed", {
            service: "redis",
            operation: "hgetall",
            key,
            error,
        });
        return {};
    }
};
exports.cacheHGetAll = cacheHGetAll;
const cacheDel = async (key) => {
    try {
        const result = await redis.del(key);
        logger_util_1.default.debug("Redis cache delete", {
            service: "redis",
            operation: "del",
            key,
            result,
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache delete failed", {
            service: "redis",
            operation: "del",
            key,
            error,
        });
        return null;
    }
};
exports.cacheDel = cacheDel;
const cacheExists = async (key) => {
    try {
        const result = await redis.exists(key);
        logger_util_1.default.debug("Redis cache exists check", {
            service: "redis",
            operation: "exists",
            key,
            exists: Boolean(result),
        });
        return result;
    }
    catch (error) {
        logger_util_1.default.error("Redis cache exists check failed", {
            service: "redis",
            operation: "exists",
            key,
            error,
        });
        return 0;
    }
};
exports.cacheExists = cacheExists;
const RedisKeys = {
    reactionBreakdown: (id) => `qotes:reaction:breakdown:${id}`,
    reactionTotal: (id) => `qotes:reaction:total:${id}`,
    reactionState: (userId, quoteId) => `qotes:reaction:state:${userId}:${quoteId}`,
    rateLimitBurst: (userId) => `qotes:ratelimit:burst:${userId}`,
    rateLimitSustain: (userId) => `qotes:ratelimit:sustain:${userId}`,
    userFollowing: (userId) => `qotes:social:following:${userId}`,
    firstPageReactions: (quoteId, viewerId) => `qotes:cache:reactions:p1:${quoteId}:${viewerId}`,
    user: (userId) => `qotes:user:${userId}`,
    userProfile: (userId) => `qotes:user:profile:${userId}`,
    userStats: (userId) => `qotes:user:stats:${userId}`,
    userFollowers: (userId) => `qotes:user:followers:${userId}`,
    userPreferences: (userId) => `qotes:user:preferences:${userId}`,
    quote: (quoteId) => `qotes:quote:${quoteId}`,
    quoteStats: (quoteId) => `qotes:quote:stats:${quoteId}`,
    userQuotes: (userId, page) => `qotes:user:quotes:${userId}:${page}`,
    globalFeed: (page) => `qotes:feed:global:${page}`,
    followingFeed: (userId, page) => `qotes:feed:following:${userId}:${page}`,
    discoverFeed: (page) => `qotes:feed:discover:${page}`,
    comments: (quoteId) => `qotes:comments:${quoteId}`,
    suggestedUsers: (userId) => `qotes:social:suggested:${userId}`,
    searchResults: (query, type) => `qotes:search:${type}:${hashString(query)}`,
    trendingHashtags: () => `qotes:trending:hashtags`,
    userCollections: (userId) => `qotes:collections:user:${userId}`,
    collectionItems: (collectionId) => `qotes:collections:items:${collectionId}`,
    notificationCount: (userId) => `qotes:notifications:count:${userId}`,
    recentNotifications: (userId) => `qotes:notifications:recent:${userId}`,
};
exports.RedisKeys = RedisKeys;
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
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
//# sourceMappingURL=redis.utils.js.map
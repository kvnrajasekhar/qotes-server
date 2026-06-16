const Redis = require("ioredis");
const dotenv = require("dotenv");
const logger = require("./logger.util");

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times) {
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

redis.on("error", (error) => {
  logger.error("Redis connection error", {
    service: "redis",
    error,
  });
});

redis.on("reconnecting", (delay) => {
  logger.warn("Redis reconnecting", {
    service: "redis",
    delay,
  });
});

const cacheGet = async (key) => {
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

const cacheSet = async (key, value, ttlSeconds) => {
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

const cacheHGetAll = async (key) => {
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

const cacheDel = async (key) => {
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

const cacheExists = async (key) => {
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
  reactionBreakdown: (id) => `qotes:reaction:breakdown:${id}`,
  reactionTotal: (id) => `qotes:reaction:total:${id}`,
  reactionState: (userId, quoteId) =>
    `qotes:reaction:state:${userId}:${quoteId}`,
  rateLimitBurst: (userId) => `qotes:ratelimit:burst:${userId}`,
  rateLimitSustain: (userId) => `qotes:ratelimit:sustain:${userId}`,
  userFollowing: (userId) => `qotes:social:following:${userId}`,
  firstPageReactions: (quoteId, viewerId) =>
    `qotes:cache:reactions:p1:${quoteId}:${viewerId}`,
};

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

module.exports = {
  redis,
  RedisKeys,
  cacheGet,
  cacheSet,
  cacheHGetAll,
  cacheDel,
  cacheExists,
};

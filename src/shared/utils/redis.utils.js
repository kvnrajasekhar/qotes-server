const Redis = require('ioredis');
const dotenv = require('dotenv');
dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  // Add resilience: exponential backoff for reconnects
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  }
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis connection error:', err.message));

// 1. CENTRALIZED KEY REGISTRY
const RedisKeys = {
  reactionBreakdown: (id) => `qotes:reaction:breakdown:${id}`,
  reactionTotal: (id) => `qotes:reaction:total:${id}`,
  reactionState: (userId, quoteId) => `qotes:reaction:state:${userId}:${quoteId}`,
  rateLimitBurst: (userId) => `qotes:ratelimit:burst:${userId}`,
  rateLimitSustain: (userId) => `qotes:ratelimit:sustain:${userId}`,
  userFollowing: (userId) => `qotes:social:following:${userId}`,
  firstPageReactions: (quoteId, viewerId) => `qotes:cache:reactions:p1:${quoteId}:${viewerId}`
};

// 2. DEFINE NATIVE COMMANDS
redis.defineCommand('updateReaction', {
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
  `
});

redis.defineCommand('slidingWindowRateLimit', {
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
  `
});

// 3. EXPORT THE INSTANCE AND REGISTRY
module.exports = { redis, RedisKeys };
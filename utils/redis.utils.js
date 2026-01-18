const Redis = require('ioredis');
const dotenv = require('dotenv');
dotenv.config();

const   redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis error', err);
});


// LUA Script for Atomic Reaction Updates
const 
REACTION_LUA = `
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
`;

// LUA Script for Sliding Window Rate Limiting
const RATE_LIMIT_LUA = `
  local now = tonumber(ARGV[1])
-- Burst window
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - ARGV[2])
local burstCount = redis.call('ZCARD', KEYS[1])
if burstCount >= tonumber(ARGV[3]) then
  return 0
end

-- Sustained window
redis.call('ZREMRANGEBYSCORE', KEYS[2], 0, now - ARGV[4])
local sustainedCount = redis.call('ZCARD', KEYS[2])
if sustainedCount >= tonumber(ARGV[5]) then
  return 0
end

-- Record event in both windows
redis.call('ZADD', KEYS[1], now, now)
redis.call('ZADD', KEYS[2], now, now)

-- Expiry (auto cleanup)
redis.call('PEXPIRE', KEYS[1], ARGV[2])
redis.call('PEXPIRE', KEYS[2], ARGV[4])
return 1
`;

module.exports = { redis, REACTION_LUA, RATE_LIMIT_LUA };
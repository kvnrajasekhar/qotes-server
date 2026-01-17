const Redis = require('ioredis');
const dotenv = require('dotenv');
dotenv.config();

const redis = new Redis({
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
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
  local current = redis.call('ZCARD', key)
  if current < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, math.ceil(window/1000))
    return 1
  end
  return 0
`;

module.exports = { redis, REACTION_LUA, RATE_LIMIT_LUA };
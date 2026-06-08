
const { redis, RedisKeys } = require('../utils/redis.utils');

/**
 * Factory function to create specific rate limiters.
 * Uses a sliding window algorithm via Redis LUA script.
 */
const createRateLimiter = ({
    actionName,
    burstWindowMs,
    burstLimit,
    sustainedWindowMs,
    sustainedLimit,
    identifier = 'ip' // Can be 'ip' or 'userId'
}) => {
    return async (req, res, next) => {
        try {
            // Determine the identifier (e.g., req.user.id for logged-in users, req.ip for guests)
            const id = identifier === 'userId' && req.user ? req.user.id : req.ip;
            
            // Dynamic key generation based on the action and identifier
            const burstKey = `qotes:ratelimit:${actionName}:burst:${id}`;
            const sustainedKey = `qotes:ratelimit:${actionName}:sustain:${id}`;

            const allowed = await redis.slidingWindowRateLimit(
                burstKey,
                sustainedKey,
                Date.now(),
                burstWindowMs,
                burstLimit,
                sustainedWindowMs,
                sustainedLimit
            );

            if (!allowed) {
                return res.status(429).json({
                    success: false,
                    message: `Too many requests for ${actionName}. Please try again later.`
                });
            }

            next();
        } catch (error) {
            console.error(`Rate Limiter Error (${actionName}):`, error.message);
            // Fail open: If Redis goes down, don't block legitimate traffic
            next();
        }
    };
};

module.exports = { createRateLimiter };
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = void 0;
const redis_utils_1 = require("../utils/redis.utils");
const createRateLimiter = ({
  actionName,
  burstWindowMs,
  burstLimit,
  sustainedWindowMs,
  sustainedLimit,
  identifier = "ip",
}) => {
  return async (req, res, next) => {
    try {
      const id = identifier === "userId" && req.user ? req.user.id : req.ip;
      const burstKey = `qotes:ratelimit:${actionName}:burst:${id}`;
      const sustainedKey = `qotes:ratelimit:${actionName}:sustain:${id}`;
      const allowed = await redis_utils_1.redis.slidingWindowRateLimit(
        burstKey,
        sustainedKey,
        Date.now(),
        burstWindowMs,
        burstLimit,
        sustainedWindowMs,
        sustainedLimit,
      );
      if (!allowed) {
        return res.status(429).json({
          success: false,
          message: `Too many requests for ${actionName}. Please try again later.`,
        });
      }
      next();
    } catch (error) {
      console.error(`Rate Limiter Error (${actionName}):`, error.message);
      next();
    }
  };
};
exports.createRateLimiter = createRateLimiter;
//# sourceMappingURL=rateLimiter.middleware.js.map

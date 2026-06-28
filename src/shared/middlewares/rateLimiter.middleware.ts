import { redis } from "../utils/redis.utils";
import { Request, Response, NextFunction } from "express";

interface RateLimiterConfig {
  actionName: string;
  burstWindowMs: number;
  burstLimit: number;
  sustainedWindowMs: number;
  sustainedLimit: number;
  identifier?: "ip" | "userId";
}

const createRateLimiter = ({
  actionName,
  burstWindowMs,
  burstLimit,
  sustainedWindowMs,
  sustainedLimit,
  identifier = "ip",
}: RateLimiterConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = identifier === "userId" && req.user ? req.user.id : req.ip;

      const burstKey = `qotes:ratelimit:${actionName}:burst:${id}`;
      const sustainedKey = `qotes:ratelimit:${actionName}:sustain:${id}`;

      const allowed = await (redis as any).slidingWindowRateLimit(
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
    } catch (error: any) {
      console.error(`Rate Limiter Error (${actionName}):`, error.message);
      next();
    }
  };
};

export { createRateLimiter };

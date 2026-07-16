import { SetMetadata } from "@nestjs/common";

export interface RateLimiterConfig {
  actionName: string;
  burstWindowMs: number;
  burstLimit: number;
  sustainedWindowMs: number;
  sustainedLimit: number;
  identifier?: "ip" | "userId";
}

export const RATE_LIMIT_KEY = "rateLimit";

export const RateLimit = (config: RateLimiterConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);

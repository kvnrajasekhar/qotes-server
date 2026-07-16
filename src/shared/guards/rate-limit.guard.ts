import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Inject } from "@nestjs/common";

interface RateLimiterConfig {
  actionName: string;
  burstWindowMs: number;
  burstLimit: number;
  sustainedWindowMs: number;
  sustainedLimit: number;
  identifier?: "ip" | "userId";
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject("REDIS") private redis: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<RateLimiterConfig>(
      "rateLimit",
      context.getHandler(),
    );

    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const id =
      config.identifier === "userId" && request.user
        ? request.user.id
        : request.ip;

    const burstKey = `qotes:ratelimit:${config.actionName}:burst:${id}`;
    const sustainedKey = `qotes:ratelimit:${config.actionName}:sustain:${id}`;

    try {
      const allowed = await this.redis.slidingWindowRateLimit(
        burstKey,
        sustainedKey,
        Date.now(),
        config.burstWindowMs,
        config.burstLimit,
        config.sustainedWindowMs,
        config.sustainedLimit,
      );

      if (!allowed) {
        throw new HttpException(
          `Too many requests for ${config.actionName}. Please try again later.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error: any) {
      if (error.status === HttpStatus.TOO_MANY_REQUESTS) {
        throw error;
      }
      console.error(
        `Rate Limiter Error (${config.actionName}):`,
        error.message,
      );
      return true;
    }
  }
}

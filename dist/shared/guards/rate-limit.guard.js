"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const common_2 = require("@nestjs/common");
let RateLimitGuard = class RateLimitGuard {
    constructor(reflector, redis) {
        this.reflector = reflector;
        this.redis = redis;
    }
    async canActivate(context) {
        const config = this.reflector.get("rateLimit", context.getHandler());
        if (!config) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const id = config.identifier === "userId" && request.user
            ? request.user.id
            : request.ip;
        const burstKey = `qotes:ratelimit:${config.actionName}:burst:${id}`;
        const sustainedKey = `qotes:ratelimit:${config.actionName}:sustain:${id}`;
        try {
            const allowed = await this.redis.slidingWindowRateLimit(burstKey, sustainedKey, Date.now(), config.burstWindowMs, config.burstLimit, config.sustainedWindowMs, config.sustainedLimit);
            if (!allowed) {
                throw new common_1.HttpException(`Too many requests for ${config.actionName}. Please try again later.`, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            return true;
        }
        catch (error) {
            if (error.status === common_1.HttpStatus.TOO_MANY_REQUESTS) {
                throw error;
            }
            console.error(`Rate Limiter Error (${config.actionName}):`, error.message);
            return true;
        }
    }
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_2.Inject)("REDIS")),
    __metadata("design:paramtypes", [core_1.Reflector, Object])
], RateLimitGuard);
//# sourceMappingURL=rate-limit.guard.js.map
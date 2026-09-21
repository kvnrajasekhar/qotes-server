"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = __importDefault(require("mongoose"));
const redis_utils_1 = require("../../shared/utils/redis.utils");
const metrics_1 = require("../../shared/observability/metrics");
const kafka_config_1 = require("../../infrastructure/kafka/config/kafka.config");
let SystemService = class SystemService {
    healthCheck() {
        return {
            success: true,
            statusCode: 200,
            message: 'System is healthy',
            data: {
                status: 'ok',
                timestamp: new Date().toISOString(),
            },
        };
    }
    readyCheck() {
        const mongoReady = mongoose_1.default.connection.readyState === 1;
        const redisReady = redis_utils_1.redis.status === 'ready';
        const kafkaReady = (0, kafka_config_1.isKafkaConnected)();
        const readiness = {
            ready: mongoReady,
            service: 'qotes-api',
            dependencies: {
                mongodb: {
                    required: true,
                    ready: mongoReady,
                    state: mongoose_1.default.connection.readyState,
                },
                redis: {
                    required: false,
                    ready: redisReady,
                    state: redis_utils_1.redis.status,
                },
                kafka: {
                    required: false,
                    ready: kafkaReady,
                    state: kafkaReady ? 'ready' : 'unavailable',
                },
            },
        };
        if (!readiness.ready) {
            return {
                success: false,
                statusCode: 503,
                message: 'Service is not ready',
                data: readiness,
            };
        }
        return {
            success: true,
            statusCode: 200,
            message: 'Service is ready',
            data: readiness,
        };
    }
    getMetrics() {
        return (0, metrics_1.getMetricsSnapshot)();
    }
};
exports.SystemService = SystemService;
exports.SystemService = SystemService = __decorate([
    (0, common_1.Injectable)()
], SystemService);
//# sourceMappingURL=system.service.js.map
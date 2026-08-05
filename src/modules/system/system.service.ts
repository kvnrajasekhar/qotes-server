import { Injectable } from "@nestjs/common";
import mongoose from "mongoose";
import { redis } from "../../shared/utils/redis.utils";
import { getMetricsSnapshot } from "../../shared/observability/metrics";
import { isKafkaConnected } from "../../infrastructure/kafka/config/kafka.config";

@Injectable()
export class SystemService {
  healthCheck() {
    return {
      success: true,
      statusCode: 200,
      message: "System is healthy",
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
      },
    };
  }

  readyCheck() {
    const mongoReady = mongoose.connection.readyState === 1;
    const redisReady = redis.status === "ready";
    const kafkaReady = isKafkaConnected();

    const readiness = {
      ready: mongoReady,
      service: "qotes-api",
      dependencies: {
        mongodb: {
          required: true,
          ready: mongoReady,
          state: mongoose.connection.readyState,
        },
        redis: {
          required: false,
          ready: redisReady,
          state: redis.status,
        },
        kafka: {
          required: false,
          ready: kafkaReady,
          state: kafkaReady ? "ready" : "unavailable",
        },
      },
    };

    if (!readiness.ready) {
      return {
        success: false,
        statusCode: 503,
        message: "Service is not ready",
        data: readiness,
      };
    }

    return {
      success: true,
      statusCode: 200,
      message: "Service is ready",
      data: readiness,
    };
  }

  getMetrics() {
    return getMetricsSnapshot();
  }
}

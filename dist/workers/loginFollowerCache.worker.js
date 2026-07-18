"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("../config/database");
const kafka_config_1 = require("../infrastructure/kafka/config/kafka.config");
const follow_model_1 = __importDefault(require("../models/follow.model"));
const redis_utils_1 = require("../shared/utils/redis.utils");
dotenv_1.default.config();
const consumer = kafka_config_1.kafka.consumer({ groupId: "cache-warmup-group" });
const runCacheWorker = async () => {
    try {
        await (0, database_1.connectToDatabase)();
        await consumer.connect();
        console.log("Cache Worker connected to Kafka");
        await consumer.subscribe({ topic: "auth-events", fromBeginning: true });
        console.log("Cache Worker subscribed to auth-events topic");
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const prefix = `${topic}[${partition} | ${message.offset}]`;
                console.log(`- ${prefix}: ${message.key} / ${message.value}`);
                try {
                    const { userId, action } = JSON.parse(message.value?.toString() || "{}");
                    if (action === "login_warmup") {
                        const cacheKey = `following:${userId}`;
                        const exists = await redis_utils_1.redis.exists(cacheKey);
                        if (!exists) {
                            const following = await follow_model_1.default.find({
                                follower: userId,
                            }).distinct("following");
                            if (following.length > 0) {
                                const ids = following.map((id) => id.toString());
                                await redis_utils_1.redis
                                    .pipeline()
                                    .sadd(cacheKey, ...ids)
                                    .expire(cacheKey, 86400)
                                    .exec();
                                console.log(`Warmed up cache for user: ${userId}`);
                            }
                        }
                    }
                }
                catch (parseErr) {
                    console.error("Error processing message:", parseErr);
                }
            },
        });
    }
    catch (error) {
        console.error("Kafka Worker Error:", error);
    }
};
runCacheWorker().catch((err) => {
    console.error("Cache worker failed to start:", err);
    process.exit(1);
});
//# sourceMappingURL=loginFollowerCache.worker.js.map
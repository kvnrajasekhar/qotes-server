import dotenv from "dotenv";
import { connectToDatabase } from "../config/database";
import { kafka } from "../infrastructure/kafka/config/kafka.config";
import Follow from "../models/follow.model";
import { redis } from "../shared/utils/redis.utils";

dotenv.config();

const consumer = kafka.consumer({ groupId: "cache-warmup-group" });

const runCacheWorker = async (): Promise<void> => {
  try {
    await connectToDatabase();

    await consumer.connect();
    console.log("Cache Worker connected to Kafka");

    await consumer.subscribe({ topic: "auth-events", fromBeginning: true });
    console.log("Cache Worker subscribed to auth-events topic");

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const prefix = `${topic}[${partition} | ${message.offset}]`;
        console.log(`- ${prefix}: ${message.key} / ${message.value}`);

        try {
          const { userId, action } = JSON.parse(
            message.value?.toString() || "{}",
          );

          if (action === "login_warmup") {
            const cacheKey = `following:${userId}`;

            const exists = await redis.exists(cacheKey);
            if (!exists) {
              const following = await Follow.find({
                follower: userId,
              }).distinct("following");

              if (following.length > 0) {
                const ids = following.map((id: any) => id.toString());

                await redis
                  .pipeline()
                  .sadd(cacheKey, ...ids)
                  .expire(cacheKey, 86400)
                  .exec();

                console.log(`Warmed up cache for user: ${userId}`);
              }
            }
          }
        } catch (parseErr: any) {
          console.error("Error processing message:", parseErr);
        }
      },
    });
  } catch (error: any) {
    console.error("Kafka Worker Error:", error);
  }
};

runCacheWorker().catch((err: Error) => {
  console.error("Cache worker failed to start:", err);
  process.exit(1);
});

const { kafka } = require('../config/kafka.config');
const Follow = require('../models/follow.model');
const { redis } = require('../utils/redis.utils');

// We use a specific groupId for cache warming
const consumer = kafka.consumer({ groupId: 'cache-warmup-group' });

const runCacheWorker = async () => {
    try {
        // 1. Connect the consumer
        await consumer.connect();
        console.log("Cache Worker connected to Kafka");

        // 2. Subscribe to the topic
        // fromBeginning: false ensures we only process new logins
        await consumer.subscribe({ topic: 'auth-events', fromBeginning: true }); // for a fresh start, set to false in production
        console.log("Cache Worker subscribed to auth-events topic");

        // 3. Run the consumer logic
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const prefix = `${topic}[${partition} | ${message.offset}]`;
                console.log(`- ${prefix}: ${message.key} / ${message.value}`);

                try {
                    const { userId, action } = JSON.parse(message.value.toString());

                    if (action === 'login_warmup') {
                        const cacheKey = `following:${userId}`;
                        
                        // Only fetch if not already in Redis to save DB resources
                        const exists = await redis.exists(cacheKey);
                        if (!exists) {
                            const following = await Follow.find({ followerId: userId })
                                                         .distinct('followingId');
                            
                            if (following.length > 0) {
                                // Convert ObjectIds to Strings for Redis
                                const ids = following.map(id => id.toString());
                                
                                await redis.pipeline()
                                    .sadd(cacheKey, ...ids)
                                    .expire(cacheKey, 86400) // 24 Hours
                                    .exec();
                                
                                console.log(`Warmed up cache for user: ${userId}`);
                            }
                        }
                    }
                } catch (parseErr) {
                    console.error("Error processing message:", parseErr);
                    // Optionally send to DLQ here if the JSON is malformed

                }
            },
        });
    } catch (error) {
        console.error("Kafka Worker Error:", error);
    }
};

// Start the worker
runCacheWorker();
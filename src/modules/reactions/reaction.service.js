const mongoose = require('mongoose');
const Reaction = require('../../models/reaction.model');
const Quote = require('../../models/quote.model');
const Follow = require('../../models/follow.model'); // Added missing import
const { redis, RedisKeys } = require('../../shared/utils/redis.utils');
const { atomicUpdateCache, getReactionBreakdown } = require('../../infrastructure/cache/reaction.cache');
const { producer } = require('../../infrastructure/kafka/config/kafka.config');

const reactionService = {
    toggleReaction: async ({ userId, quoteId, type }) => {
        // 1. RATE LIMITING (Using our new custom command)
        const allowed = await redis.slidingWindowRateLimit(
            RedisKeys.rateLimitBurst(userId),
            RedisKeys.rateLimitSustain(userId),
            Date.now(),
            10000,   // burst window (10s)
            5,       // burst limit
            3600000, // sustained window (1hr)
            20       // sustained limit
        );
        if (!allowed) throw new Error("Too many requests");

        // 2. Determine Action
        const stateKey = RedisKeys.reactionState(userId, quoteId);
        const existingType = await redis.get(stateKey);
        
        let action, oldType = null;

        if (!existingType) {
            action = 'added';      
        } else if (existingType === type) {
            action = 'removed';
        } else {
            action = 'updated';        
            oldType = existingType;
        }

        // 3. UPDATE REDIS (Fast Path)
        const delta = (action === 'added') ? 1 : (action === 'removed') ? -1 : 0;
        
        // Execute state update and count update concurrently
        const updatePromises = [atomicUpdateCache(quoteId, type, delta, oldType)];
        
        // CRITICAL FIX: Ensure the user's individual state is eagerly updated in Redis
        if (action === 'removed') {
            updatePromises.push(redis.del(stateKey));
        } else {
            // Set state with a TTL (e.g., 30 days) to prevent infinite memory growth
            updatePromises.push(redis.setex(stateKey, 2592000, type));
        }
        await Promise.all(updatePromises);

        // 4. KAFKA PRODUCER (Persistent Path)
        // Fire and forget, or handle errors so Kafka downtime doesn't break the UI
        producer.send({
            topic: 'reaction-events',
            messages: [{
                key: quoteId, 
                value: JSON.stringify({
                    eventId: `${userId}:${quoteId}`, 
                    userId,
                    quoteId,
                    type,
                    action,
                    oldType,
                    timestamp: Date.now()
                })
            }]
        }).catch(err => {
            console.error('Failed to publish reaction to Kafka:', err);
            // Optional: Push to a dead-letter queue or local retry mechanism here
        });

        // 5. IMMEDIATE RESPONSE
        return { success: true, action, type };
    },

    getQuoteReactions: async ({ quoteId, viewerId, type, cursor, limit = 10 }) => {
        // 1. GET COUNTS 
        const { breakdown, total } = await getReactionBreakdown(quoteId);

        // 2. FIRST-PAGE CACHING
        const firstPageKey = RedisKeys.firstPageReactions(quoteId, viewerId || 'guest');
        if (!cursor && !type) {
            try {
                const cached = await redis.get(firstPageKey);
                if (cached) return JSON.parse(cached);
            } catch (err) {
                console.warn('Failed to fetch first-page cache:', err.message);
            }
        }

        // 3. SOCIAL PRIORITY QUERY
        let followingIds = [];
        if (viewerId) {
            const followingKey = RedisKeys.userFollowing(viewerId);
            try {
                followingIds = await redis.smembers(followingKey);
            } catch (err) {
                console.warn('Redis smembers failed, falling back to DB:', err.message);
            }

            if (followingIds.length === 0) {
                followingIds = await Follow.find({ followerId: viewerId }).distinct('followingId');

                if (followingIds.length > 0) {
                    try {
                        // Fire and forget the read-repair
                        redis.pipeline()
                            .sadd(followingKey, ...followingIds.map(id => id.toString()))
                            .expire(followingKey, 86400) 
                            .exec();
                    } catch (err) {
                        console.error('Failed to repair following cache:', err.message);
                    }
                }
            }
        }

        const query = { quoteId: new mongoose.Types.ObjectId(quoteId) };
        if (type) query.type = type;
        if (cursor) query.createdAt = { $lt: new Date(cursor) };

        // 4. THE MONGO AGGREGATION
        const reactions = await Reaction.aggregate([
            { $match: query },
            {
                $addFields: {
                    isFriend: { 
                        $in: ["$userId", followingIds.map(id => new mongoose.Types.ObjectId(id))] 
                    }
                }
            },
            { $sort: { isFriend: -1, createdAt: -1 } },
            { $limit: limit + 1 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    type: 1,
                    createdAt: 1,
                    isFriend: 1,
                    user: { _id: 1, name: 1, username: 1, avatar: 1 }
                }
            }
        ]);

        // 5. PAGINATION & CACHE FILL
        const hasMore = reactions.length > limit;
        if (hasMore) reactions.pop();

        const result = {
            total,
            breakdown,
            users: reactions,
            pagination: {
                hasMore,
                nextCursor: hasMore ? reactions[reactions.length - 1].createdAt : null
            }
        };

        if (!cursor && !type) {
            redis.setex(firstPageKey, 30, JSON.stringify(result)).catch(err => {
                console.warn('Failed to set first-page cache:', err.message);
            });
        }

        return result;
    }
};

module.exports = reactionService;

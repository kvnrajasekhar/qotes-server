const Reaction = require('../models/reaction.model');
const Quote = require('../models/quote.model');
const { redis, RATE_LIMIT_LUA } = require('../utils/redis.utils');
const { atomicUpdateCache, getReactionBreakdown } = require('../cache/reaction.cache');
const { producer } = require('../config/kafka.config');

const reactionService = {

    toggleReaction: async ({ userId, quoteId, type }) => {
        // 1. RATE LIMITING (e.g., 5 reactions per 10s)
        const allowed = await redis.eval(RATE_LIMIT_LUA, 1, `limit:${userId}`, Date.now(), 10000, 5);
        if (!allowed) throw new Error("Too many requests");

        // 2. Determine Action (Check existing in DB/Local Cache)
        const existing = await Reaction.findOne({ user: userId, quote: quoteId }).lean();
        let action, oldType = null;

        if (!existing) {
            action = 'added';          // First reaction
        } else if (existing.type === type) {
            action = 'removed';        // Clicking same reaction → remove
        } else {
            action = 'updated';        // Clicking a different reaction → update
            oldType = existing.type;
        }

        // 3. UPDATE REDIS (Fast Path)
        const delta = (action === 'added') ? 1 : (action === 'removed') ? -1 : 0;
        await atomicUpdateCache(quoteId, type, delta, oldType);

        // 4. KAFKA PRODUCER (Persistent Path)
        await producer.send({
            topic: 'reaction-events',
            messages: [
                {
                    key: quoteId, // partition ordering
                    value: JSON.stringify({
                        eventId: `${userId}:${quoteId}`, // idempotency key
                        userId,
                        quoteId,
                        type,
                        action,
                        oldType,
                        timestamp: Date.now()
                    })
                }
            ]
        });

        // 5️⃣ IMMEDIATE RESPONSE
        return {
            success: true,
            action,
            type
        };
    },
    getQuoteReactions: async ({ quoteId, viewerId, type, cursor, limit = 10 }) => {
        // 1. GET COUNTS (Handles Read-Repair internally)
        // This is the caching part for the counters.
        const { breakdown, total } = await getReactionBreakdown(quoteId);

        // 2. FIRST-PAGE CACHING
        // If it's the first page and no specific type, check Redis to save a DB hit
        const firstPageCacheKey = `cache:reactions:p1:${quoteId}:${viewerId || 'guest'}`;
        if (!cursor && !type) {
            const cached = await redis.get(firstPageCacheKey);
            if (cached) return JSON.parse(cached);
        }

        // 3. SOCIAL PRIORITY QUERY (The Instagram Logic)
        // We need to find who the user follows to put them at the top
        let followingIds = [];
        if (viewerId) {
            // Optimization: Get following from Redis Set instead of DB
            followingIds = await redis.smembers(`following:${viewerId}`);
        }

        const query = { quoteId };
        if (type) query.type = type;
        if (cursor) query.createdAt = { $lt: new Date(cursor) };

        // 4. THE MONGO AGGREGATION
        // This handles: Sorting by (Is a Friend) then by (Recent)
        const reactions = await Reaction.aggregate([
            { $match: query },
            {
                $addFields: {
                    isFriend: { $in: ["$userId", followingIds.map(id => new mongoose.Types.ObjectId(id))] }
                }
            },
            {
                $sort: {
                    isFriend: -1,  // Priority 1: Friends
                    createdAt: -1  // Priority 2: Recency
                }
            },
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

        // Cache the first page for 30 seconds for high-traffic quotes
        if (!cursor && !type) {
            await redis.setex(firstPageCacheKey, 30, JSON.stringify(result));
        }

        return result;
    },

};
module.exports = reactionService;
const mongoose = require('mongoose');
const { redis, RedisKeys } = require('../../shared/utils/redis.utils');
const Reaction = require('../../models/reaction.model');

const CACHE_TTL_SECONDS = 3600;

async function getReactionBreakdown(quoteId) {
    try {
        let [breakdown, total] = await Promise.all([
            redis.hgetall(RedisKeys.reactionBreakdown(quoteId)),
            redis.get(RedisKeys.reactionTotal(quoteId))
        ]);

        // --- READ REPAIR ---
        if (!total || Object.keys(breakdown).length === 0) {
            const agg = await Reaction.aggregate([
                { $match: { quoteId: new mongoose.Types.ObjectId(quoteId) } },
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]);
            
            breakdown = {};
            total = 0;
            agg.forEach(r => { breakdown[r._id] = r.count; total += r.count; });

            if (total > 0) {
                await redis.pipeline()
                    .hmset(RedisKeys.reactionBreakdown(quoteId), breakdown)
                    .set(RedisKeys.reactionTotal(quoteId), total)
                    .expire(RedisKeys.reactionBreakdown(quoteId), CACHE_TTL_SECONDS)
                    // FIXED: Added missing expiration for the total key
                    .expire(RedisKeys.reactionTotal(quoteId), CACHE_TTL_SECONDS) 
                    .exec();
            }
        }
        return { breakdown, total: Number(total || 0) };
    } catch (error) {
        console.error(`Cache Error (getReactionBreakdown) for quote ${quoteId}:`, error.message);
        // Fallback gracefully so the API doesn't crash on Redis failure
        return { breakdown: {}, total: 0 }; 
    }
}

async function atomicUpdateCache(quoteId, type, delta, oldType) {
    try {
        // Now using the custom command defined in redis.utils.js
        return await redis.updateReaction(
            RedisKeys.reactionBreakdown(quoteId),
            RedisKeys.reactionTotal(quoteId),
            type,
            delta,
            oldType || "none" // Fallback to "none" if oldType is null
        );
    } catch (error) {
        console.error(`Cache Error (atomicUpdateCache) for quote ${quoteId}:`, error.message);
    }
}

module.exports = { getReactionBreakdown, atomicUpdateCache };

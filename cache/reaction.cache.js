const { redis, REACTION_LUA } = require('../utils/redis.utils');
const Reaction = require('../models/reaction.model');

const reactionsKey = (id) => `quote:reactions:${id}`;
const totalKey = (id) => `quote:reactions:total:${id}`;

async function getReactionBreakdown(quoteId) {
    let [breakdown, total] = await Promise.all([
        redis.hgetall(reactionsKey(quoteId)),
        redis.get(totalKey(quoteId))
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
                .hmset(reactionsKey(quoteId), breakdown)
                .set(totalKey(quoteId), total)
                .expire(reactionsKey(quoteId), 3600)
                .exec();
        }
    }
    return { breakdown, total: Number(total || 0) };
}

async function atomicUpdateCache(quoteId, type, delta, oldType) {
    return redis.eval(REACTION_LUA, 2, reactionsKey(quoteId), totalKey(quoteId), type, delta, oldType);
}

module.exports = { getReactionBreakdown, atomicUpdateCache };
const mongoose = require("mongoose");
const {
  redis,
  RedisKeys,
  cacheGet,
  cacheHGetAll,
} = require("../../shared/utils/redis.utils");
const Reaction = require("../../models/reaction.model");

const CACHE_TTL_SECONDS = 3600;

async function getReactionBreakdown(quoteId) {
  try {
    const [breakdown, total] = await Promise.all([
      cacheHGetAll(RedisKeys.reactionBreakdown(quoteId)),
      cacheGet(RedisKeys.reactionTotal(quoteId)),
    ]);

    if (!total || Object.keys(breakdown).length === 0) {
      const agg = await Reaction.aggregate([
        { $match: { quoteId: new mongoose.Types.ObjectId(quoteId) } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]);

      const repairedBreakdown = {};
      let repairedTotal = 0;
      agg.forEach((r) => {
        repairedBreakdown[r._id] = r.count;
        repairedTotal += r.count;
      });

      if (repairedTotal > 0) {
        await redis
          .pipeline()
          .hmset(RedisKeys.reactionBreakdown(quoteId), repairedBreakdown)
          .set(RedisKeys.reactionTotal(quoteId), repairedTotal)
          .expire(RedisKeys.reactionBreakdown(quoteId), CACHE_TTL_SECONDS)
          .expire(RedisKeys.reactionTotal(quoteId), CACHE_TTL_SECONDS)
          .exec();
      }

      return { breakdown: repairedBreakdown, total: repairedTotal };
    }

    return { breakdown, total: Number(total || 0) };
  } catch (error) {
    return { breakdown: {}, total: 0 };
  }
}

async function atomicUpdateCache(quoteId, type, delta, oldType) {
  try {
    return await redis.updateReaction(
      RedisKeys.reactionBreakdown(quoteId),
      RedisKeys.reactionTotal(quoteId),
      type,
      delta,
      oldType || "none",
    );
  } catch (error) {
    return null;
  }
}

module.exports = { getReactionBreakdown, atomicUpdateCache };

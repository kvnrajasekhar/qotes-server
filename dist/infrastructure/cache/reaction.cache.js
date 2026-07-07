"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReactionBreakdown = getReactionBreakdown;
exports.atomicUpdateCache = atomicUpdateCache;
const mongoose_1 = __importDefault(require("mongoose"));
const redis_utils_1 = require("../../shared/utils/redis.utils");
const reaction_model_1 = __importDefault(
  require("../../models/reaction.model"),
);
const CACHE_TTL_SECONDS = 3600;
async function getReactionBreakdown(quoteId) {
  try {
    const [breakdown, total] = await Promise.all([
      (0, redis_utils_1.cacheHGetAll)(
        redis_utils_1.RedisKeys.reactionBreakdown(quoteId),
      ),
      (0, redis_utils_1.cacheGet)(
        redis_utils_1.RedisKeys.reactionTotal(quoteId),
      ),
    ]);
    if (!total || Object.keys(breakdown).length === 0) {
      const agg = await reaction_model_1.default.aggregate([
        { $match: { quoteId: new mongoose_1.default.Types.ObjectId(quoteId) } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]);
      const repairedBreakdown = {};
      let repairedTotal = 0;
      agg.forEach((r) => {
        repairedBreakdown[r._id] = r.count;
        repairedTotal += r.count;
      });
      if (repairedTotal > 0) {
        await redis_utils_1.redis
          .pipeline()
          .hmset(
            redis_utils_1.RedisKeys.reactionBreakdown(quoteId),
            repairedBreakdown,
          )
          .set(redis_utils_1.RedisKeys.reactionTotal(quoteId), repairedTotal)
          .expire(
            redis_utils_1.RedisKeys.reactionBreakdown(quoteId),
            CACHE_TTL_SECONDS,
          )
          .expire(
            redis_utils_1.RedisKeys.reactionTotal(quoteId),
            CACHE_TTL_SECONDS,
          )
          .exec();
      }
      return { breakdown: repairedBreakdown, total: repairedTotal };
    }
    return {
      breakdown: breakdown,
      total: Number(total || 0),
    };
  } catch (error) {
    return { breakdown: {}, total: 0 };
  }
}
async function atomicUpdateCache(quoteId, type, delta, oldType) {
  try {
    return await redis_utils_1.redis.updateReaction(
      redis_utils_1.RedisKeys.reactionBreakdown(quoteId),
      redis_utils_1.RedisKeys.reactionTotal(quoteId),
      type,
      delta,
      oldType || "none",
    );
  } catch (error) {
    return null;
  }
}
//# sourceMappingURL=reaction.cache.js.map

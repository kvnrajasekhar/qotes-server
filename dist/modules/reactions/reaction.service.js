"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const reaction_model_1 = __importDefault(require("../../models/reaction.model"));
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const follow_model_1 = __importDefault(require("../../models/follow.model"));
const redis_utils_1 = require("../../shared/utils/redis.utils");
const reaction_cache_1 = require("../../infrastructure/cache/reaction.cache");
const kafka_config_1 = require("../../infrastructure/kafka/config/kafka.config");
const quoteNotifications_queue_1 = require("../../shared/queues/quoteNotifications.queue");
const cursor_util_1 = require("../../shared/utils/cursor.util");
const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === 'true';
const reactionService = {
    toggleReaction: async ({ userId, quoteId, type }) => {
        const allowed = await redis_utils_1.redis.slidingWindowRateLimit(redis_utils_1.RedisKeys.rateLimitBurst(userId), redis_utils_1.RedisKeys.rateLimitSustain(userId), Date.now(), 10000, 5, 3600000, 20);
        if (!allowed)
            throw new Error('Too many requests');
        const stateKey = redis_utils_1.RedisKeys.reactionState(userId, quoteId);
        const existingType = await redis_utils_1.redis.get(stateKey);
        let action, oldType = null;
        if (!existingType) {
            action = 'added';
        }
        else if (existingType === type) {
            action = 'removed';
        }
        else {
            action = 'updated';
            oldType = existingType;
        }
        const delta = action === 'added' ? 1 : action === 'removed' ? -1 : 0;
        const updatePromises = [(0, reaction_cache_1.atomicUpdateCache)(quoteId, type, delta, oldType)];
        if (action === 'removed') {
            updatePromises.push(redis_utils_1.redis.del(stateKey));
        }
        else {
            updatePromises.push(redis_utils_1.redis.setex(stateKey, 2592000, type));
        }
        await Promise.all(updatePromises);
        kafka_config_1.producer
            .send({
            topic: 'reaction-events',
            messages: [
                {
                    key: quoteId,
                    value: JSON.stringify({
                        eventId: `${userId}:${quoteId}`,
                        userId,
                        quoteId,
                        type,
                        action,
                        oldType,
                        timestamp: Date.now(),
                    }),
                },
            ],
        })
            .catch(err => {
            console.error('Failed to publish reaction to Kafka:', err);
        });
        if (action === 'added' && type === 'like') {
            void process.nextTick(async () => {
                try {
                    const quote = await quote_model_1.default.findById(quoteId).select('creator').lean();
                    const recipientId = quote?.creator?.toString();
                    if (recipientId && recipientId !== userId && NOTIFICATIONS_ENABLED) {
                        (0, quoteNotifications_queue_1.enqueueNotificationJob)({
                            type: 'quote-like',
                            recipientId,
                            actorId: userId,
                            quoteId,
                        }).catch(err => console.error('Failed to enqueue quote-like notification:', err));
                    }
                }
                catch (e) {
                    console.error('Failed to lookup quote for notification:', e);
                }
            });
        }
        return { success: true, action, type };
    },
    getQuoteReactions: async ({ quoteId, viewerId, type, cursor, limit = 10 }) => {
        const { breakdown, total } = await (0, reaction_cache_1.getReactionBreakdown)(quoteId);
        const firstPageKey = redis_utils_1.RedisKeys.firstPageReactions(quoteId, viewerId || 'guest');
        if (!cursor && !type) {
            try {
                const cached = await redis_utils_1.redis.get(firstPageKey);
                if (cached)
                    return JSON.parse(cached);
            }
            catch (err) {
                console.warn('Failed to fetch first-page cache:', err.message);
            }
        }
        let followingIds = [];
        if (viewerId) {
            const followingKey = redis_utils_1.RedisKeys.userFollowing(viewerId);
            try {
                followingIds = await redis_utils_1.redis.smembers(followingKey);
            }
            catch (err) {
                console.warn('Redis smembers failed, falling back to DB:', err.message);
            }
            if (followingIds.length === 0) {
                followingIds = await follow_model_1.default.find({ followerId: viewerId }).distinct('followingId');
                if (followingIds.length > 0) {
                    try {
                        void redis_utils_1.redis
                            .pipeline()
                            .sadd(followingKey, ...followingIds.map(id => id.toString()))
                            .expire(followingKey, 86400)
                            .exec();
                    }
                    catch (err) {
                        console.error('Failed to repair following cache:', err.message);
                    }
                }
            }
        }
        const query = { quoteId: new mongoose_1.default.Types.ObjectId(quoteId) };
        if (type)
            query.type = type;
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, 'createdAt', -1));
        }
        const reactions = await reaction_model_1.default.aggregate([
            { $match: query },
            {
                $addFields: {
                    isFriend: {
                        $in: ['$userId', followingIds.map(id => new mongoose_1.default.Types.ObjectId(id))],
                    },
                },
            },
            { $sort: { isFriend: -1, createdAt: -1 } },
            { $limit: limit + 1 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    type: 1,
                    createdAt: 1,
                    isFriend: 1,
                    user: { _id: 1, name: 1, username: 1, avatar: 1 },
                },
            },
        ]);
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(reactions, limit, ['createdAt']);
        const result = {
            total,
            breakdown,
            users: data,
            pagination,
        };
        if (!cursor && !type) {
            redis_utils_1.redis.setex(firstPageKey, 30, JSON.stringify(result)).catch(err => {
                console.warn('Failed to set first-page cache:', err.message);
            });
        }
        return result;
    },
};
exports.default = reactionService;
//# sourceMappingURL=reaction.service.js.map
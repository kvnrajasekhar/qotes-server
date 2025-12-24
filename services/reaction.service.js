const Reaction = require('../models/reaction.model');
const reactionService = {

    toggleReaction: async ({ userId, quoteId, type }) => {
        const existing = await Reaction.findOne({ userId, quoteId });

        // 1. Same reaction → remove
        if (existing && existing.type === type) {
            await existing.deleteOne();

            await Quote.findByIdAndUpdate(quoteId, {
                $inc: { reactionsCount: -1 }
            });

            return { action: 'removed', type };
        }

        // 2. Different reaction → update
        if (existing && existing.type !== type) {
            await Reaction.updateOne(
                { userId, quoteId },
                { type }
            );

            return { action: 'updated', type };
        }

        // 3. New reaction
        await Reaction.create({ userId, quoteId, type });

        await Quote.findByIdAndUpdate(quoteId, {
            $inc: { reactionsCount: 1 }
        });

        return { action: 'added', type };
    },

    getReactionsForQuote: async (quoteId) => {
        return await Reaction.find({ quoteId }).lean();
    },

    getQuoteReactions: async ({ quoteId, type, cursor, limit }) => {
        // 1. Breakdown counts (server-side aggregation)
        const breakdownAgg = await Reaction.aggregate([
            { $match: { quoteId: new mongoose.Types.ObjectId(quoteId) } },
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]);

        const breakdown = {};
        let total = 0;
        breakdownAgg.forEach(r => {
            breakdown[r._id] = r.count;
            total += r.count;
        });

        // 2. Fetch users for selected reaction tab
        const query = { quoteId };
        if (type) query.type = type;
        if (cursor) query.createdAt = { $lt: new Date(cursor) };

        const reactions = await Reaction.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .populate('userId', 'name username avatar')
            .lean();

        const hasMore = reactions.length > limit;
        if (hasMore) reactions.pop();

        const nextCursor = hasMore
            ? reactions[reactions.length - 1].createdAt
            : null;

        return {
            total,
            breakdown,
            users: reactions,
            pagination: {
                nextCursor,
                hasMore
            }
        };
    },

};
module.exports = reactionService;
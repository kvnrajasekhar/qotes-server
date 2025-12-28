const Quote = require('../models/quote.model');
const Follow = require('../models/follow.model');
const quoteService = {

    getGlobalFeed: async ({ cursor = null, limit = 10 }) => {
        const query = {};
        if (cursor) query.createdAt = { $lt: new Date(cursor) };

        const quotes = await Quote.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = quotes.length > limit;
        if (hasMore) quotes.pop();

        return {
            quotes,
            pagination: {
                nextCursor: hasMore ? quotes[quotes.length - 1].createdAt : null,
                hasMore
            }
        };
    },

    getUserQuotes: async ({ userId, cursor = null, limit = 10 }) => {
        const query = { creator: userId };
        if (cursor) query.createdAt = { $lt: new Date(cursor) };

        const quotes = await Quote.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = quotes.length > limit;
        if (hasMore) quotes.pop();

        return {
            quotes,
            pagination: {
                nextCursor: hasMore ? quotes[quotes.length - 1].createdAt : null,
                hasMore
            }
        };
    },

    getFollowingFeed: async ({ userId, cursor = null, limit = 10 }) => {
        const follows = await Follow.find({ follower: userId })
            .select('following')
            .lean();
        const followedUserIds = follows.map(f => f.following);
        if (!followedUserIds.length) {
            return { quotes: [], pagination: { nextCursor: null, hasMore: false } };
        }
        const query = {
            author: { $in: followedUserIds }
        };

        if (cursor) {
            const { createdAt, id } = decodeCursor(cursor);
            query.$or = [
                { createdAt: { $lt: createdAt } },
                { createdAt, _id: { $lt: id } }
            ];
        }

        const quotes = await Quote.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = quotes.length > limit;
        if (hasMore) quotes.pop();

        const last = quotes[quotes.length - 1];

        return {
            quotes,
            pagination: {
                nextCursor: hasMore
                    ? encodeCursor({ createdAt: last.createdAt, id: last._id })
                    : null,
                hasMore
            }
        };
    },

    // Discovery feed = popular + recent quotes from outside the user’s network.
    getDiscoverFeed: async ({ userId, cursor = null, limit = 20 }) => {
        const follows = await Follow.find({ follower: userId })
            .select('following')
            .lean();

        const followedUserIds = follows.map(f => f.following);
        const query = {
            creator: { $nin: [...followedUserIds, userId] }
        };

        if (cursor) query.createdAt = { $lt: new Date(cursor) };

        const quotes = await Quote.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = quotes.length > limit;
        if (hasMore) quotes.pop();

        return {
            quotes,
            pagination: {
                nextCursor: hasMore ? quotes[quotes.length - 1].createdAt : null,
                hasMore
            }
        };
    },

 
};

module.exports = quoteService;
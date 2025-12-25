const Quote = require('../models/quote.model');
const Follow = require('../models/follow.model');
const quoteService = {
    pagination: async (page = 1, limit = 10) => {
        const skip = (page - 1) * limit;
        const quotes = await Quote.find().skip(skip).limit(limit);
        const totalQuotes = await Quote.countDocuments();
        const totalPages = Math.ceil(totalQuotes / limit);
        return {
            quotes,
            pagination: {
                totalQuotes,
                totalPages,
                currentPage: page,
                pageSize: limit
            }
        };
    },

    getUserQuotes: async (userId, page = 1, limit = 10) => {
        const skip = (page - 1) * limit;
        const quotes = await Quote.find({ author: userId })
            .skip(skip)
            .limit(limit);
        const totalQuotes = await Quote.countDocuments({ author: userId });
        const totalPages = Math.ceil(totalQuotes / limit);
        return {
            quotes,
            pagination: {
                totalQuotes,
                totalPages,
                currentPage: page,
                pageSize: limit
            }
        };
    },

    getFollowingFeed: async ({ userId, cursor = null, limit = 10 }) => {
        // 1. Get followed user IDs (lightweight)
        const follows = await Follow.find({ follower: userId })
            .select('following')
            .lean();

        const followedUserIds = follows.map(f => f.following);

        if (followedUserIds.length === 0) {
            return {
                quotes: [],
                pagination: {
                    nextCursor: null,
                    hasMore: false
                }
            };
        }

        // 2. Build query (cursor-based)
        const query = {
            author: { $in: followedUserIds }
        };

        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) };
        }

        // 3. Fetch feed (sorted, limited)
        const quotes = await Quote.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1) // fetch one extra to check hasMore
            .lean();

        // 4. Pagination logic
        const hasMore = quotes.length > limit;
        if (hasMore) quotes.pop();

        const nextCursor = hasMore
            ? quotes[quotes.length - 1].createdAt
            : null;

        return {
            quotes,
            pagination: {
                nextCursor,
                hasMore
            }
        };
    },

    // Discovery feed = popular + recent quotes from outside the user’s network.
    getDiscoverFeed: async ({ userId, page = 1, limit = 20 }) => {
        const skip = (page - 1) * limit;
        const follows = await Follow.find({ follower: userId })
            .select('following')
            .lean();

        const followedUserIds = follows.map(f => f.following);

        // discovery logic: exclude followed users + self
        const query = {
            author: { $nin: [...followedUserIds, userId] }
        };
        const quotes = await Quote.find(query)
            .sort({
                likesCount: -1,     // popularity
                commentsCount: -1,
                createdAt: -1       // freshness
            })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Quote.countDocuments(query);

        return {
            quotes,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasMore: skip + quotes.length < total
            }
        };
    },


};

module.exports = quoteService;
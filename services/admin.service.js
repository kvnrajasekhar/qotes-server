const User = require('../models/user.model');
const Quote = require('../models/quote.model');
const adminService = {

    getAllUsers: async ({ cursor = null, limit = 20 }) => {
        const query = {};

        if (cursor) {
            query.$or = [
                { createdAt: { $lt: new Date(cursor.createdAt) } },
                {
                    createdAt: new Date(cursor.createdAt),
                    _id: { $gt: new mongoose.Types.ObjectId(cursor.id) }
                }
            ];
        }

        const users = await User.find(query)
            .sort({ createdAt: -1, _id: 1 })
            .limit(limit + 1)
            .select('-password -__v')
            .lean();

        const hasMore = users.length > limit;
        if (hasMore) users.pop();

        return {
            users,
            pagination: {
                nextCursor: hasMore
                    ? {
                        createdAt: users[users.length - 1].createdAt,
                        id: users[users.length - 1]._id
                    }
                    : null,
                hasMore
            }
        };
    },
    getHiddenQuotes: async ({ cursor = null, limit = 20 }) => {
        const query = { isHiddenBySystem: true };

        if (cursor) {
            query.$or = [
                { createdAt: { $lt: new Date(cursor.createdAt) } },
                {
                    createdAt: new Date(cursor.createdAt),
                    _id: { $gt: new mongoose.Types.ObjectId(cursor.id) }
                }
            ];
        }

        const quotes = await Quote.find(query)
            .sort({ createdAt: -1, _id: 1 })
            .limit(limit + 1)
            .populate('creator', 'username email')
            .lean();

        const hasMore = quotes.length > limit;
        if (hasMore) quotes.pop();

        return {
            quotes,
            pagination: {
                nextCursor: hasMore
                    ? {
                        createdAt: quotes[quotes.length - 1].createdAt,
                        id: quotes[quotes.length - 1]._id
                    }
                    : null,
                hasMore
            }
        };
    }

};
module.exports = adminService;
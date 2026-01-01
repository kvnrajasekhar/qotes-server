const Quote = require('../models/quote.model');
const Follow = require('../models/follow.model');
const Block = require('../models/block.model');
const UserContentPreference = require('../models/userContentPreference.model');
const quoteService = {

    getGlobalFeed: async ({ userId, cursor = null, limit = 10 }) => {
        const query = { isHiddenBySystem: { $ne: true } }; // Only show safe content

        if (userId) {
            // 1. Fetch Blocked User IDs (Both ways)
            const blocks = await Block.find({
                $or: [{ blocker: userId }, { blocked: userId }]
            }).lean();

            const blockedUserIds = blocks.map(b =>
                b.blocker.toString() === userId.toString() ? b.blocked : b.blocker
            );

            // 2. Fetch User Preferences (Not Interested)
            const preferences = await UserContentPreference.find({ userId }).lean();

            const excludedQuoteIds = preferences.filter(p => p.type === 'QUOTE').map(p => p.targetId);
            const excludedAuthors = preferences.filter(p => p.type === 'AUTHOR').map(p => p.targetId);
            const excludedTags = preferences.filter(p => p.type === 'TAG').map(p => p.targetId);

            // 3. Build the exclusion query
            // Combine blocked users and "not interested" authors
            const finalExcludedAuthors = [...new Set([...blockedUserIds, ...excludedAuthors])];

            query._id = { $nin: excludedQuoteIds };
            query.authorId = { $nin: finalExcludedAuthors };
            query.tags = { $nin: excludedTags };
        }

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

    getUserQuotes: async ({ targetUserId, viewerId = null, cursor = null, limit = 10 }) => {
        // 1. Initial Query: Only show content that belongs to the user and is safe
        const query = {
            creator: targetUserId,
            isHiddenBySystem: { $ne: true }
        };

        // 2. Safety Check: If a viewer is logged in, check for blocks
        if (viewerId) {
            // We must check if the viewer has blocked the profile owner OR vice versa
            const isBlocked = await Block.findOne({
                $or: [
                    { blocker: viewerId, blocked: targetUserId },
                    { blocker: targetUserId, blocked: viewerId }
                ]
            }).lean();

            // If a block exists, return empty or throw error (standard for X/LinkedIn)
            if (isBlocked) {
                return {
                    quotes: [],
                    pagination: { nextCursor: null, hasMore: false },
                    isBlocked: true // UI can use this to show "You are blocked" or "User not found"
                };
            }
        }

        // 3. Pagination Logic
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
        // 1. Get the list of people the user follows
        const follows = await Follow.find({ follower: userId })
            .select('following')
            .lean();

        let followedUserIds = follows.map(f => f.following);

        if (!followedUserIds.length) {
            return { quotes: [], pagination: { nextCursor: null, hasMore: false } };
        }

        // 2. SAFETY & PRIVACY OVERRIDE
        // We must remove people who have blocked the user or whom the user has blocked
        const blocks = await Block.find({
            $or: [{ blocker: userId }, { blocked: userId }]
        }).lean();

        const blockedIds = blocks.map(b =>
            b.blocker.toString() === userId.toString() ? b.blocked.toString() : b.blocker.toString()
        );

        // Filter the following list to remove blocked entities
        followedUserIds = followedUserIds.filter(id => !blockedIds.includes(id.toString()));

        // 3. USER PREFERENCES (Not Interested)
        // Even if I follow someone, I might have flagged a specific quote or tag as "Not Interested"
        const preferences = await UserContentPreference.find({ userId }).lean();

        const excludedQuoteIds = preferences.filter(p => p.type === 'QUOTE').map(p => p.targetId);
        const excludedTags = preferences.filter(p => p.type === 'TAG').map(p => p.targetId);
        // Note: We don't filter excludedAuthors here because the user is explicitly following them, 
        // but you could add that logic if "Muting" is a separate feature.

        // 4. CONSTRUCT THE MASTER QUERY
        const query = {
            author: { $in: followedUserIds },
            _id: { $nin: excludedQuoteIds },
            tags: { $nin: excludedTags },
            isHiddenBySystem: { $ne: true } // Safety threshold from Report Service
        };

        // 5. PAGINATION (Tie-breaker cursor logic)
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
        // 1. Core Discovery Logic: Exclude self
        const query = {
            creator: { $ne: userId },
            isHiddenBySystem: { $ne: true } // Safety: Hide reported content
        };

        if (userId) {
            // 2. Fetch people user already follows (don't show them in discover)
            const follows = await Follow.find({ follower: userId })
                .select('following')
                .lean();
            const followedUserIds = follows.map(f => f.following);

            // 3. Fetch Blocks (Two-way)
            const blocks = await Block.find({
                $or: [{ blocker: userId }, { blocked: userId }]
            }).lean();
            const blockedIds = blocks.map(b =>
                b.blocker.toString() === userId.toString() ? b.blocked : b.blocker
            );

            // 4. Fetch User Preferences (Not Interested)
            const preferences = await UserContentPreference.find({ userId }).lean();

            const excludedQuoteIds = preferences.filter(p => p.type === 'QUOTE').map(p => p.targetId);
            const excludedAuthors = preferences.filter(p => p.type === 'AUTHOR').map(p => p.targetId);
            const excludedTags = preferences.filter(p => p.type === 'TAG').map(p => p.targetId);

            // 5. Combine all Author exclusions: (Following + Blocked + Not Interested Authors)
            const totalExcludedAuthors = [
                ...new Set([
                    ...followedUserIds.map(id => id.toString()),
                    ...blockedIds.map(id => id.toString()),
                    ...excludedAuthors.map(id => id.toString()),
                    userId.toString()
                ])
            ];

            // 6. Build final sanitized query
            query.creator = { $nin: totalExcludedAuthors };
            query._id = { $nin: excludedQuoteIds };
            query.tags = { $nin: excludedTags };
        }

        // 7. Pagination
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
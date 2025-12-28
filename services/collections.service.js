const Collection = require('../models/collection.model');
const CollectionItem = require('../models/collectionItem.model');
const Quote = require('../models/quote.model');

const collectionService = {

    getUserCollections: async ({ userId, cursor = null, limit = 20 }) => {
        const query = { owner: userId };

        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) };
        }

        const collections = await Collection.find(query)
            .select('name isPrivate isDefault createdAt')
            .sort({ isDefault: -1, createdAt: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = collections.length > limit;
        if (hasMore) collections.pop();

        return {
            collections,
            pagination: {
                nextCursor: hasMore ? collections[collections.length - 1].createdAt : null,
                hasMore
            }
        };
    },

    getCollectionDetails: async ({ collectionId, cursor = null, limit = 20 }) => {
        const query = { collectionId };

        if (cursor) {
            query.addedAt = { $lt: new Date(cursor) };
        }

        const items = await CollectionItem.find(query)
            .sort({ addedAt: -1 })
            .limit(limit + 1)
            .populate({
                path: 'quoteId',
                select: 'text author category reactions likes saves requotes createdAt'
            })
            .lean();

        const hasMore = items.length > limit;
        if (hasMore) items.pop();

        return {
            items: items.map(i => i.quoteId),
            pagination: {
                nextCursor: hasMore ? items[items.length - 1].addedAt : null,
                hasMore
            }
        };
    },

    getQuoteDetails: async (quoteId, userId) => {
        const quote = await Quote.findById(quoteId)
            .populate('creator', 'username avatar')
            .lean();

        if (!quote) throw new Error("Quote not found");

        const userReaction = await Reaction.findOne({ quoteId, userId }).select('type');

        // Improved isSaved check: Checks if the quote exists in ANY of the user's collections
        const userCollections = await Collection.find({ owner: userId }).distinct('_id');
        const isSaved = await CollectionItem.exists({
            quoteId,
            collectionId: { $in: userCollections }
        });

        return {
            ...quote,
            currentUserReaction: userReaction ? userReaction.type : null,
            isSaved: !!isSaved
        };
    },

    toggleSave: async (userId, quoteId, collectionId = null) => {
        let targetCollectionId = collectionId;

        if (!targetCollectionId) {
            let defaultCollection = await Collection.findOne({ owner: userId, isDefault: true });
            if (!defaultCollection) {
                defaultCollection = await Collection.create({
                    owner: userId,
                    name: 'Saved',
                    isPrivate: true,
                    isDefault: true
                });
            }
            targetCollectionId = defaultCollection._id;
        } else {
            const isOwner = await Collection.exists({ _id: targetCollectionId, owner: userId });
            if (!isOwner) throw new Error('Unauthorized');
        }

        const existing = await CollectionItem.findOne({ collectionId: targetCollectionId, quoteId });

        if (existing) {
            await CollectionItem.deleteOne({ _id: existing._id });
            await Quote.findByIdAndUpdate(quoteId, { $inc: { saves: -1 } });
            return { saved: false };
        }

        await CollectionItem.create({ collectionId: targetCollectionId, quoteId });
        await Quote.findByIdAndUpdate(quoteId, { $inc: { saves: 1 } });

        return { saved: true };
    },
};

module.exports = collectionService;
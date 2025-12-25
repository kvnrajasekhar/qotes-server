const Collection = require('../models/collection.model');
const CollectionItem = require('../models/collectionItem.model');
const Quote = require('../models/quote.model');

const collectionService = {

    getUserCollections: async (userId) => {
        return await Collection.find({ owner: userId })
            .select('name isPrivate isDefault createdAt')
            .sort({ isDefault: -1, createdAt: -1 }) // Default folder first
            .lean();
    },

    getCollectionDetails: async (collectionId, page = 1, limit = 20) => {
        const skip = (page - 1) * limit;

        const items = await CollectionItem.find({ collectionId })
            .sort({ addedAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'quoteId',
                select: 'text author category' // Fixed 'text' vs 'content' (matches your schema)
            })
            .lean();

        const totalItems = await CollectionItem.countDocuments({ collectionId });

        return {
            items: items.map(i => i.quoteId), // Flattens the array for the frontend
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit),
            totalItems
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
            // Find or Create Default
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
            if (!isOwner) throw new Error("You do not own this collection");
        }

        const existingItem = await CollectionItem.findOne({
            collectionId: targetCollectionId,
            quoteId
        });

        if (existingItem) {
            await CollectionItem.deleteOne({ _id: existingItem._id });
            await Quote.findByIdAndUpdate(quoteId, { $inc: { saves: -1 } });
            return { saved: false, message: "Removed from collection" };
        } else {
            await CollectionItem.create({ collectionId: targetCollectionId, quoteId });
            await Quote.findByIdAndUpdate(quoteId, { $inc: { saves: 1 } });
            return { saved: true, message: "Saved to collection" };
        }
    },
};

module.exports = collectionService;
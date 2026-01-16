const { get } = require('mongoose');
const Quote = require('../models/quote.model');
const Reaction = require('../models/reaction.model');
const quoteService = {

    createQuote: async ({
        text,
        author,
        category,
        hashtags = [],
        taggedUsers = [],
        creator,
        isRequote = false,
        parentQuoteId = null,
        isHiddenBySystem = false
    }) => {
        const session = await Quote.startSession();
        session.startTransaction();

        try {
            // Validate parent quote if requote
            if (isRequote) {
                if (!parentQuoteId) {
                    throw new Error('parentQuoteId is required for requote');
                }

                const parentQuote = await Quote.findOne({
                    _id: parentQuoteId,
                    isHiddenBySystem: false
                }).session(session);

                if (!parentQuote) {
                    throw new Error('Parent quote not found or hidden');
                }

                // Prevent duplicate requote by same user
                const alreadyRequoted = await Quote.exists({
                    creator,
                    parentQuoteId
                }).session(session);

                if (alreadyRequoted) {
                    throw new Error('Already requoted');
                }
            }

            const newQuote = await Quote.create([{
                text,
                author: author || 'Anonymous',
                category: category || '',
                hashtags: hashtags || [],
                taggedUsers,
                creator,
                isRequote,
                parentQuoteId,
                isHiddenBySystem
            }], { session });

            if (isRequote) {
                await Quote.updateOne(
                    { _id: parentQuoteId },
                    { $inc: { requotes: 1 } },
                    { session }
                );
            }

            await session.commitTransaction();
            session.endSession();

            const savedQuote = newQuote[0];
            return savedQuote;

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },

    getQuoteById: async (id) => {
        return await Quote.findById(id);
    },
    getAllQuotes: async () => {
        return await Quote.find();
    },
    updateQuote: async (id, updateData) => {
        return await Quote.findByIdAndUpdate(id, updateData, { new: true });
    },
    deleteQuote: async (id) => {
        return await Quote.findByIdAndDelete(id);
    },
    getQuotesByUser: async ({ userId, cursor = null, limit = 20 }) => {
        const query = { creator: userId };

        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) };
        }

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

    likeQuote: async (quoteId, userId) => {
        const quote = await Quote.findById(quoteId);
        if (!quote) {
            return null;
        }
        if (!quote.likes.includes(userId)) {
            quote.likes.push(userId);
            await quote.save();
        }
        // return the updated like count
        return { likeCount: quote.likes.length };
    },


};

module.exports = quoteService;

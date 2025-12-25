const Quote = require('../models/quote.model');
const Reaction = require('../models/reaction.model');
const quoteService = {

    createQuote: async ({
        text,
        author,
        category,
        hashtags,
        taggedUsers,
        creator,
        isRequote = false,
        parentQuoteId = null
    }) => {
        const quoteData = {
            text,
            author: author || 'Anonymous',
            category : category || '',
            hashtags,
            taggedUsers,
            creator,
            isRequote,
            parentQuoteId
        };

        const newQuote = new Quote(quoteData);

        // if this is a requote, increment parent requote count
        if (isRequote && parentQuoteId) {
            await Quote.findByIdAndUpdate(parentQuoteId, {
                $inc: { requotes: 1 }
            });
        }

        return await newQuote.save();
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
    getQuotesByUser: async (userId) => {
        return await Quote.find({ creator: userId });
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

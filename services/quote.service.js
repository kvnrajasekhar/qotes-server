const Quote = require('../models/quote.model');
const Reaction = require('../models/reaction.model');
const quoteService = {

    createQuote: async ({ quote, author, category, hashtags, taggedUsers }) => {
        const quoteData = {
            text: quote,
            author: author || 'Anonymous',
            category,
            hashtags,
            taggedUsers
        };

        const newQuote = new Quote(quoteData);
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

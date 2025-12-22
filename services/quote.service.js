const Quote = require('../models/quote.model');
const quoteService = {
    
    createQuote: async ({quote, author, category, hashtags, taggedUsers}) => {
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

};

module.exports = quoteService;

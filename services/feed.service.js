const Quote = require('../models/quote.model');

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
};
module.exports = quoteService;
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QuoteSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, auto: true },
    text: { type: String, required: true },
    author: { type: String, default: 'Anonymous' },
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    category: { type: String },
    hashtags: [{ type: String }],
    likes: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    requotes: { type: Number, default: 0 },
    reactions: { type: Map, of: Number, default: {} },
    isRequote: { type: Boolean, default: false },
    parentQuoteId: { type: Schema.Types.ObjectId, ref: 'Quote', index: true },
    createdAt: { type: Date, default: Date.now }
});

QuoteSchema.index({ creator: 1, createdAt: -1 });
QuoteSchema.index({ createdAt: -1 });
QuoteSchema.index({ category: 1, createdAt: -1 });
QuoteSchema.index({ isRequote: 1 });

const Quote = mongoose.model('Quote', QuoteSchema);
module.exports = Quote;
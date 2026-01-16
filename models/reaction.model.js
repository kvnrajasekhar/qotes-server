const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReactionSchema = new Schema({
    quote: { type: Schema.Types.ObjectId, ref: 'Quote', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
        type: String, 
        enum: ['like', 'inspriring', 'thoughtful', 'realatable', 'eye-opening'], 
        required: true 
    },
    createdAt: { type: Date, default: Date.now }
});

/** * CRITICAL INDEX 1: Unique Integrity
 * Prevents a user from having two different reactions on the same quote.
 * This is your "Idempotency" layer at the DB level.
 */
ReactionSchema.index({ quote: 1, user: 1 }, { unique: true });

/** * CRITICAL INDEX 2: Social Priority & Pagination
 * Used for "Friends First" logic. By including user and createdAt, 
 * the aggregation can sort and filter without a full collection scan.
 */
ReactionSchema.index({ quote: 1, user: 1, createdAt: -1 });

/** * CRITICAL INDEX 3: Filtered Breakdown
 * Supports: "Show me all 'inspiring' reactions for this quote, newest first."
 */
ReactionSchema.index({ quote: 1, type: 1, createdAt: -1 });

/** * CRITICAL INDEX 4: General Feed
 * Supports: "Show me all reactions for this quote, newest first."
 */
ReactionSchema.index({ quote: 1, createdAt: -1 });

const Reaction = mongoose.model('Reaction', ReactionSchema);
module.exports = Reaction;
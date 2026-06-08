const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CollectionItemSchema = new Schema({
  collectionId: { type: Schema.Types.ObjectId, ref: 'Collection', index: true },
  quoteId: { type: Schema.Types.ObjectId, ref: 'Quote', index: true },
  addedAt: { type: Date, default: Date.now }
});

CollectionItemSchema.index({ collectionId: 1, quoteId: 1 }, { unique: true });
const CollectionItem = mongoose.model('CollectionItem', CollectionItemSchema);
module.exports = CollectionItem;
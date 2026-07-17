import mongoose, { Schema, Document } from "mongoose";

interface ICollectionItem extends Document {
  collectionId: mongoose.Types.ObjectId;
  quoteId: mongoose.Types.ObjectId;
  addedAt: Date;
}

const CollectionItemSchema = new Schema<ICollectionItem>({
  collectionId: { type: Schema.Types.ObjectId, ref: "Collection", index: true },
  quoteId: { type: Schema.Types.ObjectId, ref: "Quote", index: true },
  addedAt: { type: Date, default: Date.now },
});

CollectionItemSchema.index({ collectionId: 1, quoteId: 1 }, { unique: true });
CollectionItemSchema.index({ collectionId: 1, addedAt: -1 });
CollectionItemSchema.index({ quoteId: 1 });

const CollectionItem = mongoose.model<ICollectionItem>(
  "CollectionItem",
  CollectionItemSchema,
);
export default CollectionItem;
export { CollectionItemSchema, ICollectionItem };

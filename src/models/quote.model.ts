import mongoose, { Schema, Document } from "mongoose";

interface IQuote extends Document {
  text: string;
  author: string;
  creator?: mongoose.Types.ObjectId;
  category?: string;
  hashtags: string[];
  likes: number;
  saves: number;
  requotes: number;
  reactions: Map<string, number>;
  isRequote: boolean;
  parentQuoteId?: mongoose.Types.ObjectId;
  isHiddenBySystem: boolean;
  createdAt: Date;
}

const QuoteSchema = new Schema<IQuote>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  text: { type: String, required: true },
  author: { type: String, default: "Anonymous" },
  creator: { type: Schema.Types.ObjectId, ref: "User" },
  category: { type: String },
  hashtags: [{ type: String }],
  likes: { type: Number, default: 0 },
  saves: { type: Number, default: 0 },
  requotes: { type: Number, default: 0 },
  reactions: { type: Map, of: Number, default: {} },
  isRequote: { type: Boolean, default: false },
  parentQuoteId: { type: Schema.Types.ObjectId, ref: "Quote", index: true },
  isHiddenBySystem: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

QuoteSchema.index({ creator: 1, createdAt: -1 });
QuoteSchema.index({ createdAt: -1 });
QuoteSchema.index({ category: 1, createdAt: -1 });
QuoteSchema.index({ isRequote: 1 });
QuoteSchema.index(
  { creator: 1, parentQuoteId: 1 },
  { unique: true, partialFilterExpression: { isRequote: true } },
);

const Quote = mongoose.model<IQuote>("Quote", QuoteSchema);
export default Quote;

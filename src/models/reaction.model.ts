import mongoose, { Schema, Document } from "mongoose";

type ReactionType =
  | "like"
  | "inspriring"
  | "thoughtful"
  | "realatable"
  | "eye-opening";

interface IReaction extends Document {
  quote: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: ReactionType;
  createdAt: Date;
}

const ReactionSchema = new Schema<IReaction>({
  quote: { type: Schema.Types.ObjectId, ref: "Quote", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["like", "inspriring", "thoughtful", "realatable", "eye-opening"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

ReactionSchema.index({ quote: 1, user: 1 }, { unique: true });
ReactionSchema.index({ quote: 1, user: 1, createdAt: -1 });
ReactionSchema.index({ quote: 1, type: 1, createdAt: -1 });
ReactionSchema.index({ quote: 1, createdAt: -1 });

const Reaction = mongoose.model<IReaction>("Reaction", ReactionSchema);
export default Reaction;

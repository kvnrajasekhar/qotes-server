import mongoose, { Schema, Document } from "mongoose";

interface IComment extends Document {
  quote: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  text: string;
  likes: mongoose.Types.ObjectId[];
  parentComment?: mongoose.Types.ObjectId;
  repliesCount: number;
  createdAt: Date;
  isEdited: boolean;
  updatedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const CommentSchema = new Schema<IComment>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  quote: { type: Schema.Types.ObjectId, ref: "Quote", required: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  parentComment: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
  repliesCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  isEdited: { type: Boolean, default: false },
  updatedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
});

CommentSchema.index({ quote: 1, createdAt: -1 });
CommentSchema.index({ parentComment: 1, createdAt: -1 });
CommentSchema.index({ author: 1, createdAt: -1 });

const Comment = mongoose.model<IComment>("Comment", CommentSchema);
export default Comment;

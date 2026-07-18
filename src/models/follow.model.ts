import mongoose, { Schema, Document } from "mongoose";

interface IFollow extends Document {
  follower: mongoose.Types.ObjectId;
  following: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FollowSchema = new Schema<IFollow>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  follower: { type: Schema.Types.ObjectId, ref: "User", required: true },
  following: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

FollowSchema.index({ following: 1, _id: -1 });
FollowSchema.index({ follower: 1, _id: -1 });
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
FollowSchema.index({ following: 1, createdAt: -1 });
FollowSchema.index({ follower: 1, createdAt: -1 });
FollowSchema.index({ following: 1, createdAt: -1, _id: -1 });
FollowSchema.index({ follower: 1, createdAt: -1, _id: -1 });

const Follow = mongoose.model<IFollow>("Follow", FollowSchema);
export default Follow;
export { FollowSchema, IFollow };

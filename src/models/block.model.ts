import mongoose, { Schema, Document } from "mongoose";

interface IUserBlock extends Document {
  blocker: mongoose.Types.ObjectId;
  blocked: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserBlockSchema = new Schema<IUserBlock>(
  {
    blocker: { type: Schema.Types.ObjectId, ref: "User", required: true },
    blocked: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

UserBlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

UserBlockSchema.index({ blocker: 1 });
UserBlockSchema.index({ blocked: 1 });
UserBlockSchema.index({ blocker: 1, createdAt: -1 });
UserBlockSchema.index({ blocked: 1, createdAt: -1 });

const UserBlock = mongoose.model<IUserBlock>("UserBlock", UserBlockSchema);
export default UserBlock;
export { UserBlockSchema, IUserBlock };

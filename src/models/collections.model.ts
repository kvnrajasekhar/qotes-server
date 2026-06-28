import mongoose, { Schema, Document } from "mongoose";

interface ICollection extends Document {
  owner: mongoose.Types.ObjectId;
  name: string;
  description: string;
  isPrivate: boolean;
  isDefault: boolean;
}

const CollectionSchema = new Schema<ICollection>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  isPrivate: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
});

const Collection = mongoose.model<ICollection>("Collection", CollectionSchema);
export default Collection;

import mongoose, { Schema, Document } from "mongoose";

interface IToken extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  passwordResetToken?: string;
  expiresAt?: Date;
  createdAt: Date;
}

const tokenSchema = new Schema<IToken>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  refreshToken: { type: String, required: true },
  passwordResetToken: { type: String },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now, expires: "7d" },
});

const Token = mongoose.model<IToken>("Token", tokenSchema);
export default Token;
export { tokenSchema, IToken };

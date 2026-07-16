import mongoose, { Schema, Document } from "mongoose";

interface IUserStats {
  followerCount: number;
  followingCount: number;
  quoteCount: number;
}

interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  bio: string;
  avatarUrl: string;
  stats: IUserStats;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    firstName: { type: String },
    lastName: { type: String },
    bio: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    stats: {
      followerCount: { type: Number, default: 0 },
      followingCount: { type: Number, default: 0 },
      quoteCount: { type: Number, default: 0 },
    },
    isBanned: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model<IUser>("User", UserSchema);
export default User;
export { UserSchema, IUser, IUserStats };

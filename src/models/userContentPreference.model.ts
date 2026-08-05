import mongoose, { Schema, Document } from "mongoose";

type PreferenceType = "QUOTE" | "AUTHOR" | "TAG";
type PreferenceReason =
  | "NOT_INTERESTED"
  | "SEEN_TOO_MUCH"
  | "SENSITIVE_TOPIC"
  | "OFFENSIVE"
  | "NOT_INSPIRATIONAL";

interface IUserContentPreference extends Document {
  userId: mongoose.Types.ObjectId;
  type: PreferenceType;
  targetId: string;
  reason: PreferenceReason;
  createdAt: Date;
  updatedAt: Date;
}

const userContentPreferenceSchema = new Schema<IUserContentPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["QUOTE", "AUTHOR", "TAG"],
      required: true,
    },
    targetId: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "NOT_INTERESTED",
        "SEEN_TOO_MUCH",
        "SENSITIVE_TOPIC",
        "OFFENSIVE",
        "NOT_INSPIRATIONAL",
      ],
      default: "NOT_INTERESTED",
    },
  },
  { timestamps: true },
);

userContentPreferenceSchema.index(
  { userId: 1, type: 1, targetId: 1 },
  { unique: true },
);

userContentPreferenceSchema.index({ userId: 1 });
userContentPreferenceSchema.index({ userId: 1, type: 1, createdAt: -1 });
userContentPreferenceSchema.index({ type: 1, targetId: 1 });

export default mongoose.model<IUserContentPreference>(
  "UserContentPreference",
  userContentPreferenceSchema,
);
export { userContentPreferenceSchema, IUserContentPreference, PreferenceType, PreferenceReason };

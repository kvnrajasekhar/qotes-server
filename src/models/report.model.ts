import mongoose, { Schema, Document } from "mongoose";

type TargetType = "QUOTE" | "USER" | "COMMENT";

interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId;
  targetType: TargetType;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: ["QUOTE", "USER", "COMMENT"] },
    reason: { type: String },
  },
  { timestamps: true },
);

reportSchema.index({ reporterId: 1, targetId: 1 }, { unique: true });
reportSchema.index({ targetId: 1 });

const Report = mongoose.model<IReport>("Report", reportSchema);
export default Report;
export { reportSchema, IReport, TargetType };

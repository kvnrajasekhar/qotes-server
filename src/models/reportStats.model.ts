import mongoose, { Schema, Document } from "mongoose";

type ReportStatus = "PENDING" | "RESOLVED";

interface IReportStats extends Document {
  targetId: mongoose.Types.ObjectId;
  targetType: string;
  totalReports: number;
  status: ReportStatus;
  lastReportedAt?: Date;
}

const reportStatsSchema = new Schema<IReportStats>({
  targetId: { type: Schema.Types.ObjectId, unique: true },
  targetType: String,
  totalReports: { type: Number, default: 0 },
  status: { type: String, enum: ["PENDING", "RESOLVED"], default: "PENDING" },
  lastReportedAt: Date,
});

reportStatsSchema.index({ targetId: 1 }, { unique: true });
reportStatsSchema.index({ status: 1, totalReports: -1 });
reportStatsSchema.index({ lastReportedAt: -1 });
reportStatsSchema.index({ targetType: 1, status: 1, totalReports: -1 });

const ReportStats = mongoose.model<IReportStats>(
  "ReportStats",
  reportStatsSchema,
);
export default ReportStats;
export { reportStatsSchema, IReportStats, ReportStatus };

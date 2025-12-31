const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportStatsSchema = new Schema({
    targetId: { type: ObjectId, unique: true },
    targetType: String,
    totalReports: { type: Number, default: 0 },
    status: { type: String, enum: ['PENDING', 'RESOLVED'], default: 'PENDING' },
    lastReportedAt: Date
});

// A. Unique Content Identifier
// Essential for the findOneAndUpdate ($inc) operation to be lightning fast.
reportStatsSchema.index({ targetId: 1 }, { unique: true });

// B. The "Priority" Index (Sort + Filter)
// Follows the ESR Rule (Equality, Sort, Range). 
// Used to find: "Pending items sorted by most reports."
reportStatsSchema.index({ status: 1, totalReports: -1 });

// C. Recency Index
// Used if you want to see the latest reported items first.
reportStatsSchema.index({ lastReportedAt: -1 });

const ReportStats = mongoose.model("ReportStats", reportStatsSchema);
module.exports = ReportStats;
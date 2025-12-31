const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reportSchema = new Schema({
    reporterId: { type: ObjectId, ref: 'User', required: true },
    targetId: { type: ObjectId, required: true },
    targetType: { type: String, enum: ['QUOTE', 'USER', 'COMMENT'] },
    reason: { type: String },
}, { timestamps: true });

// Prevent same user from reporting same thing twice
reportSchema.index({ reporterId: 1, targetId: 1 }, { unique: true });
// Essential for when an admin says: "Show me all the people who reported Quote X."
reportSchema.index({ targetId: 1 });

const Report = mongoose.model("Report", reportSchema);
module.exports = Report;
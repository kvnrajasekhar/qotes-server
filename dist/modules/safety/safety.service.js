"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const block_model_1 = __importDefault(require("../../models/block.model"));
const report_model_1 = __importDefault(require("../../models/report.model"));
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const follow_model_1 = __importDefault(require("../../models/follow.model"));
const reportStats_model_1 = __importDefault(
  require("../../models/reportStats.model"),
);
const safetyService = {
  toggleBlockUser: async (blockerId, blockedId) => {
    if (blockerId.toString() === blockedId.toString()) {
      throw new Error("Users cannot block themselves");
    }
    const existingBlock = await block_model_1.default.findOne({
      blocker: blockerId,
      blocked: blockedId,
    });
    if (existingBlock) {
      await block_model_1.default.deleteOne({ _id: existingBlock._id });
      return { blocked: false };
    } else {
      const session = await block_model_1.default.startSession();
      session.startTransaction();
      try {
        await block_model_1.default.create(
          [{ blocker: blockerId, blocked: blockedId }],
          { session },
        );
        await follow_model_1.default.deleteMany(
          {
            $or: [
              { follower: blockerId, following: blockedId },
              { follower: blockedId, following: blockerId },
            ],
          },
          { session },
        );
        await session.commitTransaction();
        return { blocked: true };
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    }
  },
  report: async (reporterId, targetType, targetId, reason) => {
    try {
      await report_model_1.default.create({
        reporterId,
        targetType,
        targetId,
        reason,
      });
      const stats = await reportStats_model_1.default.findOneAndUpdate(
        { targetId },
        {
          targetType,
          $inc: { totalReports: 1 },
          lastReportedAt: new Date(),
          status: "PENDING",
        },
        { upsert: true, new: true },
      );
      if (stats.totalReports >= 10) {
        await quote_model_1.default.findByIdAndUpdate(targetId, {
          isHiddenBySystem: true,
        });
      }
      return stats;
    } catch (err) {
      if (err.code === 11000) throw new Error("Already reported.");
      throw err;
    }
  },
};
exports.default = safetyService;
//# sourceMappingURL=safety.service.js.map

// @ts-nocheck
import Block from "../../models/block.model";
import Report from "../../models/report.model";
import User from "../../models/user.model";
import Quote from "../../models/quote.model";
import Follow from "../../models/follow.model";
import ReportStats from "../../models/reportStats.model";
const safetyService = {
  toggleBlockUser: async (blockerId, blockedId) => {
    if (blockerId.toString() === blockedId.toString()) {
      throw new Error("Users cannot block themselves");
    }

    const existingBlock = await Block.findOne({
      blocker: blockerId,
      blocked: blockedId,
    });

    if (existingBlock) {
      await Block.deleteOne({ _id: existingBlock._id });
      return { blocked: false };
    } else {
      // LARGE SCALE ADDITION: Use a Transaction for data consistency
      const session = await Block.startSession();
      session.startTransaction();
      try {
        await Block.create([{ blocker: blockerId, blocked: blockedId }], {
          session,
        });

        // Force Unfollow both ways (Assuming you have a Follow model)
        await Follow.deleteMany(
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

  // Report a user, quote, or comment
  report: async (reporterId, targetType, targetId, reason) => {
    // 1. Create the individual report (Deduplication handled by Unique Index)
    try {
      await Report.create({ reporterId, targetType, targetId, reason });

      // 2. Update the Stats (Upsert ensures the doc exists)
      const stats = await ReportStats.findOneAndUpdate(
        { targetId },
        {
          targetType,
          $inc: { totalReports: 1 },
          lastReportedAt: new Date(),
          status: "PENDING",
        },
        { upsert: true, new: true },
      );

      // 3. Simple threshold check using the Stats object
      if (stats.totalReports >= 10) {
        await Quote.findByIdAndUpdate(targetId, { isHiddenBySystem: true });
      }

      return stats;
    } catch (err) {
      if (err.code === 11000) throw new Error("Already reported.");
      throw err;
    }
  },
};

export default safetyService;

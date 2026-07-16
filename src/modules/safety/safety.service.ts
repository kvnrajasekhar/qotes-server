import {
  Injectable,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, ClientSession } from "mongoose";

import Block, { IUserBlock } from "../../models/block.model";
import Report, { IReport } from "../../models/report.model";
import User, { IUser } from "../../models/user.model";
import Quote, { IQuote } from "../../models/quote.model";
import Follow, { IFollow } from "../../models/follow.model";
import ReportStats, { IReportStats } from "../../models/reportStats.model";

@Injectable()
export class SafetyService {
  constructor(
    @InjectModel(Block.name) private blockModel: Model<IUserBlock>,
    @InjectModel(Report.name) private reportModel: Model<IReport>,
    @InjectModel(User.name) private userModel: Model<IUser>,
    @InjectModel(Quote.name) private quoteModel: Model<IQuote>,
    @InjectModel(Follow.name) private followModel: Model<IFollow>,
    @InjectModel(ReportStats.name)
    private reportStatsModel: Model<IReportStats>,
  ) {}

  async toggleBlockUser(blockerId: string, blockedId: string) {
    if (blockerId.toString() === blockedId.toString()) {
      throw new BadRequestException("Users cannot block themselves");
    }

    const existingBlock = await this.blockModel.findOne({
      blocker: blockerId,
      blocked: blockedId,
    });

    if (existingBlock) {
      await this.blockModel.deleteOne({ _id: existingBlock._id });
      return { blocked: false };
    } else {
      const session = await this.blockModel.startSession();
      session.startTransaction();
      try {
        await this.blockModel.create(
          [{ blocker: blockerId, blocked: blockedId }],
          {
            session,
          },
        );

        await this.followModel.deleteMany(
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
  }

  async report(
    reporterId: string,
    targetType: string,
    targetId: string,
    reason: string,
  ) {
    try {
      await this.reportModel.create({
        reporterId,
        targetType,
        targetId,
        reason,
      });

      const stats = await this.reportStatsModel.findOneAndUpdate(
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
        await this.quoteModel.findByIdAndUpdate(targetId, {
          isHiddenBySystem: true,
        });
      }

      return stats;
    } catch (err: any) {
      if (err.code === 11000) throw new ConflictException("Already reported.");
      throw err;
    }
  }
}

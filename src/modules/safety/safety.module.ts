import { SafetyController } from "./safety.controller";
import { SafetyService } from "./safety.service";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

// Import your schemas/models
import { UserBlockSchema } from "../../models/block.model";
import { reportSchema } from "../../models/report.model";
import { UserSchema } from "../../models/user.model";
import { QuoteSchema } from "../../models/quote.model";
import { FollowSchema } from "../../models/follow.model";
import { reportStatsSchema } from "../../models/reportStats.model";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Block", schema: UserBlockSchema },
      { name: "Report", schema: reportSchema },
      { name: "User", schema: UserSchema },
      { name: "Quote", schema: QuoteSchema },
      { name: "Follow", schema: FollowSchema },
      { name: "ReportStats", schema: reportStatsSchema },
    ]),
  ],
  controllers: [SafetyController],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}

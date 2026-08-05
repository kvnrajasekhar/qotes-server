"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafetyService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let SafetyService = class SafetyService {
    constructor(blockModel, reportModel, userModel, quoteModel, followModel, reportStatsModel) {
        this.blockModel = blockModel;
        this.reportModel = reportModel;
        this.userModel = userModel;
        this.quoteModel = quoteModel;
        this.followModel = followModel;
        this.reportStatsModel = reportStatsModel;
    }
    async toggleBlockUser(blockerId, blockedId) {
        if (blockerId.toString() === blockedId.toString()) {
            throw new common_1.BadRequestException("Users cannot block themselves");
        }
        const existingBlock = await this.blockModel.findOne({
            blocker: blockerId,
            blocked: blockedId,
        });
        if (existingBlock) {
            await this.blockModel.deleteOne({ _id: existingBlock._id });
            return { blocked: false };
        }
        else {
            const session = await this.blockModel.startSession();
            session.startTransaction();
            try {
                await this.blockModel.create([{ blocker: blockerId, blocked: blockedId }], {
                    session,
                });
                await this.followModel.deleteMany({
                    $or: [
                        { follower: blockerId, following: blockedId },
                        { follower: blockedId, following: blockerId },
                    ],
                }, { session });
                await session.commitTransaction();
                return { blocked: true };
            }
            catch (error) {
                await session.abortTransaction();
                throw error;
            }
            finally {
                await session.endSession();
            }
        }
    }
    async report(reporterId, targetType, targetId, reason) {
        try {
            await this.reportModel.create({
                reporterId,
                targetType,
                targetId,
                reason,
            });
            const stats = await this.reportStatsModel.findOneAndUpdate({ targetId }, {
                targetType,
                $inc: { totalReports: 1 },
                lastReportedAt: new Date(),
                status: "PENDING",
            }, { upsert: true, new: true });
            if (stats.totalReports >= 10) {
                await this.quoteModel.findByIdAndUpdate(targetId, {
                    isHiddenBySystem: true,
                });
            }
            return stats;
        }
        catch (err) {
            if (err.code === 11000)
                throw new common_1.ConflictException("Already reported.");
            throw err;
        }
    }
};
exports.SafetyService = SafetyService;
exports.SafetyService = SafetyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)("Block")),
    __param(1, (0, mongoose_1.InjectModel)("Report")),
    __param(2, (0, mongoose_1.InjectModel)("User")),
    __param(3, (0, mongoose_1.InjectModel)("Quote")),
    __param(4, (0, mongoose_1.InjectModel)("Follow")),
    __param(5, (0, mongoose_1.InjectModel)("ReportStats")),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], SafetyService);
//# sourceMappingURL=safety.service.js.map
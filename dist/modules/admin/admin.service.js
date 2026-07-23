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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const cursor_util_1 = require("../../shared/utils/cursor.util");
let AdminService = class AdminService {
    constructor(userModel, quoteModel) {
        this.userModel = userModel;
        this.quoteModel = quoteModel;
    }
    async getAllUsers({ cursor = null, limit = 20, }) {
        const query = {};
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCompoundCursorQuery)(cursor, ["createdAt", "_id"], [-1, 1]));
        }
        const users = await this.userModel
            .find(query)
            .sort({ createdAt: -1, _id: 1 })
            .limit(limit + 1)
            .select("-password -__v")
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(users, limit, [
            "createdAt",
            "_id",
        ]);
        return {
            users: data,
            pagination,
        };
    }
    async getHiddenQuotes({ cursor = null, limit = 20, }) {
        const query = { isHiddenBySystem: true };
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCompoundCursorQuery)(cursor, ["createdAt", "_id"], [-1, 1]));
        }
        const quotes = await this.quoteModel
            .find(query)
            .sort({ createdAt: -1, _id: 1 })
            .limit(limit + 1)
            .populate("creator", "username email createdAt")
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, [
            "createdAt",
            "_id",
        ]);
        return {
            quotes: data,
            pagination,
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('User')),
    __param(1, (0, mongoose_1.InjectModel)('Quote')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], AdminService);
//# sourceMappingURL=admin.service.js.map
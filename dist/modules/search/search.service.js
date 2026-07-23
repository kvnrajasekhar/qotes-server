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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const mongoose_3 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../../models/user.model"));
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const cursor_util_1 = require("../../shared/utils/cursor.util");
let SearchService = class SearchService {
    constructor(userModel, quoteModel) {
        this.userModel = userModel;
        this.quoteModel = quoteModel;
    }
    async searchUsers({ query, cursor = null, limit = 20, }) {
        if (!query || !query.trim()) {
            return {
                users: [],
                pagination: { nextCursor: null, hasMore: false },
            };
        }
        const escaped = query.replace(/[*+?^${}()|[\]\\]/g, "\\$&");
        const exactRegex = new RegExp(`^${escaped}$`, "i");
        const prefixRegex = new RegExp(`^${escaped}`, "i");
        const containsRegex = new RegExp(escaped, "i");
        const pipeline = [
            {
                $match: {
                    $or: [
                        { username: containsRegex },
                        { firstName: containsRegex },
                        { lastName: containsRegex },
                    ],
                },
            },
            {
                $addFields: {
                    score: {
                        $add: [
                            {
                                $cond: [
                                    { $regexMatch: { input: "$username", regex: exactRegex } },
                                    100,
                                    0,
                                ],
                            },
                            {
                                $cond: [
                                    { $regexMatch: { input: "$username", regex: prefixRegex } },
                                    60,
                                    0,
                                ],
                            },
                            {
                                $cond: [
                                    { $regexMatch: { input: "$firstName", regex: prefixRegex } },
                                    40,
                                    0,
                                ],
                            },
                            {
                                $cond: [
                                    { $regexMatch: { input: "$lastName", regex: prefixRegex } },
                                    40,
                                    0,
                                ],
                            },
                            {
                                $cond: [
                                    { $regexMatch: { input: "$username", regex: containsRegex } },
                                    20,
                                    0,
                                ],
                            },
                            {
                                $cond: [
                                    {
                                        $regexMatch: { input: "$firstName", regex: containsRegex },
                                    },
                                    10,
                                    0,
                                ],
                            },
                            {
                                $cond: [
                                    { $regexMatch: { input: "$lastName", regex: containsRegex } },
                                    10,
                                    0,
                                ],
                            },
                            { $cond: [{ $gt: ["$stats.followerCount", 1000] }, 15, 0] },
                        ],
                    },
                },
            },
            { $match: { score: { $gt: 0 } } },
        ];
        if (cursor) {
            const decoded = (0, cursor_util_1.decodeCursor)(cursor);
            pipeline.push({
                $match: {
                    $or: [
                        { score: { $lt: decoded.score } },
                        {
                            score: decoded.score,
                            _id: { $gt: new mongoose_3.default.Types.ObjectId(String(decoded.id)) },
                        },
                    ],
                },
            });
        }
        pipeline.push({ $sort: { score: -1, _id: 1 } }, { $limit: limit + 1 }, { $project: { password: 0, __v: 0 } });
        const users = await this.userModel.aggregate(pipeline);
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(users, limit, [
            "score",
            "_id",
        ]);
        return {
            users: data,
            pagination,
        };
    }
    async searchGlobal({ query, type = "all", limit = 20, cursor = {} }) {
        if (!query || !query.trim()) {
            return {
                results: { users: [], quotes: [], hashtags: [] },
                pagination: { nextCursor: null, hasMore: false },
            };
        }
        const escaped = query.replace(/[*+?^${}()|[\]\\]/g, "\\$&");
        const containsRegex = new RegExp(escaped, "i");
        const prefixRegex = new RegExp(`^${escaped}`, "i");
        const results = {
            users: [],
            quotes: [],
            hashtags: [],
        };
        const nextCursor = {};
        if (type === "all" || type === "users") {
            const userResult = await this.searchUsers({
                query,
                cursor: cursor.users || null,
                limit,
            });
            results.users = userResult.users;
            nextCursor.users = userResult.pagination.nextCursor;
        }
        if (type === "all" || type === "quotes") {
            const quoteQuery = {
                isHiddenBySystem: false,
                $or: [{ text: containsRegex }, { hashtags: prefixRegex }],
            };
            if (cursor?.quotes) {
                Object.assign(quoteQuery, (0, cursor_util_1.buildCursorQuery)(cursor.quotes, "createdAt", -1));
            }
            const quotes = await this.quoteModel
                .find(quoteQuery)
                .sort({ createdAt: -1 })
                .limit(limit + 1)
                .populate("creator", "username avatarUrl")
                .lean();
            const { data: quoteData, pagination: quotePagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, ["createdAt"]);
            results.quotes = quoteData;
            nextCursor.quotes = quotePagination.nextCursor;
        }
        if (type === "all" || type === "hashtags") {
            const hashtags = await this.quoteModel.aggregate([
                { $match: { hashtags: prefixRegex } },
                { $unwind: "$hashtags" },
                { $match: { hashtags: prefixRegex } },
                { $group: { _id: "$hashtags", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: Math.ceil(limit / 3) },
            ]);
            results.hashtags = hashtags.map((h) => ({
                tag: h._id,
                usageCount: h.count,
            }));
        }
        return {
            results,
            pagination: {
                nextCursor,
                hasMore: Object.values(nextCursor).some(Boolean),
            },
        };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_model_1.default.name)),
    __param(1, (0, mongoose_1.InjectModel)(quote_model_1.default.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], SearchService);
//# sourceMappingURL=search.service.js.map
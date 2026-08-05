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
exports.FeedsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const follow_model_1 = __importDefault(require("../../models/follow.model"));
const block_model_1 = __importDefault(require("../../models/block.model"));
const userContentPreference_model_1 = __importDefault(require("../../models/userContentPreference.model"));
const cursor_util_1 = require("../../shared/utils/cursor.util");
const quote_cache_1 = require("../../infrastructure/cache/quote.cache");
let FeedsService = class FeedsService {
    constructor(quoteModel, followModel, blockModel, preferenceModel, quoteCache) {
        this.quoteModel = quoteModel;
        this.followModel = followModel;
        this.blockModel = blockModel;
        this.preferenceModel = preferenceModel;
        this.quoteCache = quoteCache;
    }
    async getGlobalFeed({ userId, cursor = null, limit = 10 }) {
        const page = this.extractPageFromCursor(cursor);
        return await this.quoteCache.getGlobalFeed(page, async () => {
            const query = { isHiddenBySystem: { $ne: true } };
            if (userId) {
                const blocks = await this.blockModel.find({
                    $or: [{ blocker: userId }, { blocked: userId }],
                }).lean();
                const blockedUserIds = blocks.map((b) => b.blocker.toString() === userId.toString() ? b.blocked : b.blocker);
                const preferences = await this.preferenceModel.find({ userId }).lean();
                const excludedQuoteIds = preferences
                    .filter((p) => p.type === 'QUOTE')
                    .map((p) => p.targetId);
                const excludedAuthors = preferences
                    .filter((p) => p.type === 'AUTHOR')
                    .map((p) => p.targetId);
                const excludedTags = preferences
                    .filter((p) => p.type === 'TAG')
                    .map((p) => p.targetId);
                const finalExcludedAuthors = [
                    ...new Set([...blockedUserIds, ...excludedAuthors]),
                ];
                query._id = { $nin: excludedQuoteIds };
                query.authorId = { $nin: finalExcludedAuthors };
                query.tags = { $nin: excludedTags };
            }
            if (cursor) {
                Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, 'createdAt', -1));
            }
            const quotes = await this.quoteModel
                .find(query)
                .sort({ createdAt: -1 })
                .limit(limit + 1)
                .lean();
            const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, [
                'createdAt',
            ]);
            return {
                quotes: data,
                pagination,
            };
        });
    }
    extractPageFromCursor(cursor) {
        if (!cursor)
            return 1;
        try {
            const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
            return decoded.page || 1;
        }
        catch {
            return 1;
        }
    }
    async getUserQuotes({ targetUserId, viewerId = null, cursor = null, limit = 10, }) {
        const query = {
            creator: targetUserId,
            isHiddenBySystem: { $ne: true },
        };
        if (viewerId) {
            const isBlocked = await this.blockModel.findOne({
                $or: [
                    { blocker: viewerId, blocked: targetUserId },
                    { blocker: targetUserId, blocked: viewerId },
                ],
            }).lean();
            if (isBlocked) {
                return {
                    quotes: [],
                    pagination: { nextCursor: null, hasMore: false },
                    isBlocked: true,
                };
            }
        }
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, 'createdAt', -1));
        }
        const quotes = await this.quoteModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, [
            'createdAt',
        ]);
        return {
            quotes: data,
            pagination,
        };
    }
    async getFollowingFeed({ userId, cursor = null, limit = 10 }) {
        const follows = await this.followModel.find({ follower: userId })
            .select('following')
            .lean();
        let followedUserIds = follows.map((f) => f.following);
        if (!followedUserIds.length) {
            return { quotes: [], pagination: { nextCursor: null, hasMore: false } };
        }
        const blocks = await this.blockModel.find({
            $or: [{ blocker: userId }, { blocked: userId }],
        }).lean();
        const blockedIds = blocks.map((b) => b.blocker.toString() === userId.toString()
            ? b.blocked.toString()
            : b.blocker.toString());
        followedUserIds = followedUserIds.filter((id) => !blockedIds.includes(id.toString()));
        const preferences = await this.preferenceModel.find({ userId }).lean();
        const excludedQuoteIds = preferences
            .filter((p) => p.type === 'QUOTE')
            .map((p) => p.targetId);
        const excludedTags = preferences
            .filter((p) => p.type === 'TAG')
            .map((p) => p.targetId);
        const query = {
            author: { $in: followedUserIds },
            _id: { $nin: excludedQuoteIds },
            tags: { $nin: excludedTags },
            isHiddenBySystem: { $ne: true },
        };
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCompoundCursorQuery)(cursor, ['createdAt', '_id'], [-1, -1]));
        }
        const quotes = await this.quoteModel
            .find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1)
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, [
            'createdAt',
            '_id',
        ]);
        return {
            quotes: data,
            pagination,
        };
    }
    async getDiscoverFeed({ userId, cursor = null, limit = 20 }) {
        const page = this.extractPageFromCursor(cursor);
        return await this.quoteCache.getDiscoverFeed(page, async () => {
            const query = {
                creator: { $ne: userId },
                isHiddenBySystem: { $ne: true },
            };
            if (userId) {
                const follows = await this.followModel.find({ follower: userId })
                    .select('following')
                    .lean();
                const followedUserIds = follows.map((f) => f.following);
                const blocks = await this.blockModel.find({
                    $or: [{ blocker: userId }, { blocked: userId }],
                }).lean();
                const blockedIds = blocks.map((b) => b.blocker.toString() === userId.toString() ? b.blocked : b.blocker);
                const preferences = await this.preferenceModel.find({ userId }).lean();
                const excludedQuoteIds = preferences
                    .filter((p) => p.type === 'QUOTE')
                    .map((p) => p.targetId);
                const excludedAuthors = preferences
                    .filter((p) => p.type === 'AUTHOR')
                    .map((p) => p.targetId);
                const excludedTags = preferences
                    .filter((p) => p.type === 'TAG')
                    .map((p) => p.targetId);
                const totalExcludedAuthors = [
                    ...new Set([
                        ...followedUserIds.map((id) => id.toString()),
                        ...blockedIds.map((id) => id.toString()),
                        ...excludedAuthors.map((id) => id.toString()),
                        userId.toString(),
                    ]),
                ];
                query.creator = { $nin: totalExcludedAuthors };
                query._id = { $nin: excludedQuoteIds };
                query.tags = { $nin: excludedTags };
            }
            if (cursor) {
                Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, 'createdAt', -1));
            }
            const quotes = await this.quoteModel
                .find(query)
                .sort({ createdAt: -1 })
                .limit(limit + 1)
                .lean();
            const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, [
                'createdAt',
            ]);
            return {
                quotes: data,
                pagination,
            };
        });
    }
};
exports.FeedsService = FeedsService;
exports.FeedsService = FeedsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(quote_model_1.default.name)),
    __param(1, (0, mongoose_1.InjectModel)(follow_model_1.default.name)),
    __param(2, (0, mongoose_1.InjectModel)(block_model_1.default.name)),
    __param(3, (0, mongoose_1.InjectModel)(userContentPreference_model_1.default.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        quote_cache_1.QuoteCacheService])
], FeedsService);
//# sourceMappingURL=feeds.service.js.map
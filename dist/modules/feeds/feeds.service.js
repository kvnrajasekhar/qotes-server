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
exports.FeedsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
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
    async getGlobalFeed({ userId, cursor = null, limit = 10, }) {
        const fetchDbFeed = async () => {
            const query = { isHiddenBySystem: { $ne: true } };
            if (userId) {
                const [blocks, preferences] = await Promise.all([
                    this.blockModel.find({ $or: [{ blocker: userId }, { blocked: userId }] }).lean(),
                    this.preferenceModel.find({ userId }).lean(),
                ]);
                const blockedUserIds = blocks.map(b => b.blocker.toString() === userId.toString() ? b.blocked : b.blocker);
                const excludedQuoteIds = preferences
                    .filter(p => p.type === 'QUOTE')
                    .map(p => new mongoose_2.Types.ObjectId(p.targetId));
                const excludedAuthors = preferences
                    .filter(p => p.type === 'AUTHOR')
                    .map(p => new mongoose_2.Types.ObjectId(p.targetId));
                const excludedTags = preferences.filter(p => p.type === 'TAG').map(p => p.targetId);
                const finalExcludedCreators = [
                    ...new Set([
                        ...blockedUserIds.map(id => id.toString()),
                        ...excludedAuthors.map(id => id.toString()),
                    ]),
                ].map(id => new mongoose_2.Types.ObjectId(id));
                if (excludedQuoteIds.length)
                    query._id = { $nin: excludedQuoteIds };
                if (finalExcludedCreators.length)
                    query.creator = { $nin: finalExcludedCreators };
                if (excludedTags.length)
                    query.tags = { $nin: excludedTags };
            }
            if (cursor) {
                Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, 'createdAt', -1));
            }
            const quotes = await this.quoteModel
                .find(query)
                .sort({ createdAt: -1 })
                .limit(limit + 1)
                .populate('creator', 'username firstName lastName avatarUrl')
                .lean();
            const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, ['createdAt']);
            return { quotes: data, pagination };
        };
        if (!userId) {
            const page = this.extractPageFromCursor(cursor);
            return await this.quoteCache.getGlobalFeed(page, fetchDbFeed);
        }
        return await fetchDbFeed();
    }
    async getFollowingFeed({ userId, cursor = null, limit = 10, }) {
        const follows = (await this.followModel
            .find({ follower: userId })
            .select('following')
            .lean());
        let followedUserIds = follows.map(f => f.following);
        if (!followedUserIds.length) {
            return { quotes: [], pagination: { nextCursor: null, hasMore: false } };
        }
        const blocks = await this.blockModel
            .find({ $or: [{ blocker: userId }, { blocked: userId }] })
            .lean();
        const blockedIds = new Set(blocks.map(b => b.blocker.toString() === userId.toString() ? b.blocked.toString() : b.blocker.toString()));
        followedUserIds = followedUserIds.filter(id => !blockedIds.has(id.toString()));
        const preferences = await this.preferenceModel.find({ userId }).lean();
        const excludedQuoteIds = preferences
            .filter(p => p.type === 'QUOTE')
            .map(p => new mongoose_2.Types.ObjectId(p.targetId));
        const excludedTags = preferences.filter(p => p.type === 'TAG').map(p => p.targetId);
        const query = {
            creator: { $in: followedUserIds },
            isHiddenBySystem: { $ne: true },
        };
        if (excludedQuoteIds.length)
            query._id = { $nin: excludedQuoteIds };
        if (excludedTags.length)
            query.tags = { $nin: excludedTags };
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCompoundCursorQuery)(cursor, ['createdAt', '_id'], [-1, -1]));
        }
        const quotes = await this.quoteModel
            .find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1)
            .populate('creator', 'username firstName lastName avatarUrl')
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, ['createdAt', '_id']);
        return { quotes: data, pagination };
    }
    async getUserQuotes({ targetUserId, viewerId = null, cursor = null, limit = 10, }) {
        if (viewerId) {
            const isBlocked = await this.blockModel
                .findOne({
                $or: [
                    { blocker: viewerId, blocked: targetUserId },
                    { blocker: targetUserId, blocked: viewerId },
                ],
            })
                .lean();
            if (isBlocked) {
                return {
                    quotes: [],
                    pagination: { nextCursor: null, hasMore: false },
                    isBlocked: true,
                };
            }
        }
        const query = {
            creator: new mongoose_2.Types.ObjectId(targetUserId),
            isHiddenBySystem: { $ne: true },
        };
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, 'createdAt', -1));
        }
        const quotes = await this.quoteModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .populate('creator', 'username firstName lastName avatarUrl')
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, ['createdAt']);
        return { quotes: data, pagination };
    }
    async getDiscoverFeed({ userId, cursor = null, limit = 10, }) {
        const query = { isHiddenBySystem: { $ne: true } };
        if (userId) {
            const [follows, blocks, preferences] = await Promise.all([
                this.followModel.find({ follower: userId }).select('following').lean(),
                this.blockModel.find({ $or: [{ blocker: userId }, { blocked: userId }] }).lean(),
                this.preferenceModel.find({ userId }).lean(),
            ]);
            const followedUserIds = follows.map(f => f.following.toString());
            const blockedUserIds = blocks.map(b => b.blocker.toString() === userId.toString() ? b.blocked.toString() : b.blocker.toString());
            const excludedAuthors = preferences
                .filter(p => p.type === 'AUTHOR')
                .map(p => p.targetId.toString());
            const excludedQuoteIds = preferences
                .filter(p => p.type === 'QUOTE')
                .map(p => new mongoose_2.Types.ObjectId(p.targetId));
            const excludedTags = preferences.filter(p => p.type === 'TAG').map(p => p.targetId);
            const excludedCreators = [
                ...new Set([userId.toString(), ...followedUserIds, ...blockedUserIds, ...excludedAuthors]),
            ].map(id => new mongoose_2.Types.ObjectId(id));
            query.creator = { $nin: excludedCreators };
            if (excludedQuoteIds.length)
                query._id = { $nin: excludedQuoteIds };
            if (excludedTags.length)
                query.tags = { $nin: excludedTags };
        }
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCompoundCursorQuery)(cursor, ['createdAt', '_id'], [-1, -1]));
        }
        const quotes = await this.quoteModel
            .find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1)
            .populate('creator', 'username firstName lastName avatarUrl')
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, ['createdAt', '_id']);
        return { quotes: data, pagination };
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
};
exports.FeedsService = FeedsService;
exports.FeedsService = FeedsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Quote')),
    __param(1, (0, mongoose_1.InjectModel)('Follow')),
    __param(2, (0, mongoose_1.InjectModel)('Block')),
    __param(3, (0, mongoose_1.InjectModel)('UserContentPreference')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        quote_cache_1.QuoteCacheService])
], FeedsService);
//# sourceMappingURL=feeds.service.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const follow_model_1 = __importDefault(require("../../models/follow.model"));
const block_model_1 = __importDefault(require("../../models/block.model"));
const userContentPreference_model_1 = __importDefault(require("../../models/userContentPreference.model"));
const cursor_util_1 = require("../../shared/utils/cursor.util");
const quoteService = {
    getGlobalFeed: async ({ userId, cursor = null, limit = 10 }) => {
        const query = { isHiddenBySystem: { $ne: true } };
        if (userId) {
            const blocks = await block_model_1.default.find({
                $or: [{ blocker: userId }, { blocked: userId }],
            }).lean();
            const blockedUserIds = blocks.map((b) => b.blocker.toString() === userId.toString() ? b.blocked : b.blocker);
            const preferences = await userContentPreference_model_1.default.find({ userId }).lean();
            const excludedQuoteIds = preferences
                .filter((p) => p.type === "QUOTE")
                .map((p) => p.targetId);
            const excludedAuthors = preferences
                .filter((p) => p.type === "AUTHOR")
                .map((p) => p.targetId);
            const excludedTags = preferences
                .filter((p) => p.type === "TAG")
                .map((p) => p.targetId);
            const finalExcludedAuthors = [
                ...new Set([...blockedUserIds, ...excludedAuthors]),
            ];
            query._id = { $nin: excludedQuoteIds };
            query.authorId = { $nin: finalExcludedAuthors };
            query.tags = { $nin: excludedTags };
        }
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, "createdAt", -1));
        }
        const quotes = await quote_model_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, [
            "createdAt",
        ]);
        return {
            quotes: data,
            pagination,
        };
    },
    getUserQuotes: async ({ targetUserId, viewerId = null, cursor = null, limit = 10, }) => {
        const query = {
            creator: targetUserId,
            isHiddenBySystem: { $ne: true },
        };
        if (viewerId) {
            const isBlocked = await block_model_1.default.findOne({
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
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, "createdAt", -1));
        }
        const quotes = await quote_model_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, [
            "createdAt",
        ]);
        return {
            quotes: data,
            pagination,
        };
    },
    getFollowingFeed: async ({ userId, cursor = null, limit = 10 }) => {
        const follows = await follow_model_1.default.find({ follower: userId })
            .select("following")
            .lean();
        let followedUserIds = follows.map((f) => f.following);
        if (!followedUserIds.length) {
            return { quotes: [], pagination: { nextCursor: null, hasMore: false } };
        }
        const blocks = await block_model_1.default.find({
            $or: [{ blocker: userId }, { blocked: userId }],
        }).lean();
        const blockedIds = blocks.map((b) => b.blocker.toString() === userId.toString()
            ? b.blocked.toString()
            : b.blocker.toString());
        followedUserIds = followedUserIds.filter((id) => !blockedIds.includes(id.toString()));
        const preferences = await userContentPreference_model_1.default.find({ userId }).lean();
        const excludedQuoteIds = preferences
            .filter((p) => p.type === "QUOTE")
            .map((p) => p.targetId);
        const excludedTags = preferences
            .filter((p) => p.type === "TAG")
            .map((p) => p.targetId);
        const query = {
            author: { $in: followedUserIds },
            _id: { $nin: excludedQuoteIds },
            tags: { $nin: excludedTags },
            isHiddenBySystem: { $ne: true },
        };
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCompoundCursorQuery)(cursor, ["createdAt", "_id"], [-1, -1]));
        }
        const quotes = await quote_model_1.default.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1)
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, [
            "createdAt",
            "_id",
        ]);
        return {
            quotes: data,
            pagination,
        };
    },
    getDiscoverFeed: async ({ userId, cursor = null, limit = 20 }) => {
        const query = {
            creator: { $ne: userId },
            isHiddenBySystem: { $ne: true },
        };
        if (userId) {
            const follows = await follow_model_1.default.find({ follower: userId })
                .select("following")
                .lean();
            const followedUserIds = follows.map((f) => f.following);
            const blocks = await block_model_1.default.find({
                $or: [{ blocker: userId }, { blocked: userId }],
            }).lean();
            const blockedIds = blocks.map((b) => b.blocker.toString() === userId.toString() ? b.blocked : b.blocker);
            const preferences = await userContentPreference_model_1.default.find({ userId }).lean();
            const excludedQuoteIds = preferences
                .filter((p) => p.type === "QUOTE")
                .map((p) => p.targetId);
            const excludedAuthors = preferences
                .filter((p) => p.type === "AUTHOR")
                .map((p) => p.targetId);
            const excludedTags = preferences
                .filter((p) => p.type === "TAG")
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
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, "createdAt", -1));
        }
        const quotes = await quote_model_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, [
            "createdAt",
        ]);
        return {
            quotes: data,
            pagination,
        };
    },
};
exports.default = quoteService;
//# sourceMappingURL=feed.service.js.map
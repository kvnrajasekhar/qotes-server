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
exports.QuotesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const user_model_1 = __importDefault(require("../../models/user.model"));
const imageGeneration_queue_1 = require("../../shared/queues/imageGeneration.queue");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_constants_1 = require("../notifications/notification.constants");
const cursor_util_1 = require("../../shared/utils/cursor.util");
const quote_cache_1 = require("../../infrastructure/cache/quote.cache");
const cache_invalidation_service_1 = require("../../infrastructure/cache/cache-invalidation.service");
const IMAGE_GENERATION_ENABLED = process.env.IMAGE_GENERATION_ENABLED === 'true';
const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === 'true';
let QuotesService = class QuotesService {
    constructor(quoteModel, userModel, notificationsService, quoteCache, cacheInvalidation) {
        this.quoteModel = quoteModel;
        this.userModel = userModel;
        this.notificationsService = notificationsService;
        this.quoteCache = quoteCache;
        this.cacheInvalidation = cacheInvalidation;
    }
    async createQuote({ text, author, category, hashtags = [], taggedUsers = [], creator, isRequote = false, parentQuoteId = null, isHiddenBySystem = false, }) {
        const session = await this.quoteModel.startSession();
        session.startTransaction();
        try {
            if (isRequote) {
                if (!parentQuoteId) {
                    throw new common_1.BadRequestException('parentQuoteId is required for requote');
                }
                const parentQuote = await this.quoteModel.findOne({
                    _id: parentQuoteId,
                    isHiddenBySystem: false,
                }).session(session);
                if (!parentQuote) {
                    throw new common_1.NotFoundException('Parent quote not found or hidden');
                }
                const alreadyRequoted = await this.quoteModel.exists({
                    creator,
                    parentQuoteId,
                }).session(session);
                if (alreadyRequoted) {
                    throw new common_1.BadRequestException('Already requoted');
                }
            }
            const newQuote = await this.quoteModel.create([
                {
                    text,
                    author: author || 'Anonymous',
                    category: category || '',
                    hashtags: hashtags || [],
                    taggedUsers,
                    creator,
                    isRequote,
                    parentQuoteId,
                    isHiddenBySystem,
                },
            ], { session });
            if (isRequote) {
                await this.quoteModel.updateOne({ _id: parentQuoteId }, { $inc: { requotes: 1 } }, { session });
                if (NOTIFICATIONS_ENABLED) {
                    void process.nextTick(async () => {
                        try {
                            const parentQuote = await this.quoteModel.findById(parentQuoteId)
                                .select('creator text author')
                                .lean();
                            const requoter = await this.userModel.findById(creator).lean();
                            if (parentQuote && requoter && parentQuote.creator.toString() !== creator) {
                                await this.notificationsService.createNotification({
                                    recipient: parentQuote.creator.toString(),
                                    sender: creator,
                                    type: notification_constants_1.NOTIFICATION_TYPES.REQUOTE_QUOTE,
                                    message: `${requoter.username || 'Someone'} requoted your quote`,
                                    referenceId: newQuote[0]._id.toString(),
                                    referenceType: notification_constants_1.REFERENCE_TYPES.QUOTE,
                                    metadata: {
                                        originalQuoteId: parentQuoteId,
                                        originalQuoteText: parentQuote.text,
                                        originalQuoteAuthor: parentQuote.author,
                                        senderName: requoter.username,
                                    },
                                });
                            }
                        }
                        catch (error) {
                            console.error('Failed to create requote notification:', error);
                        }
                    });
                }
            }
            void session.commitTransaction();
            void session.endSession();
            const savedQuote = newQuote[0];
            await this.quoteCache.warmUpQuoteCache(savedQuote);
            this.cacheInvalidation.emitQuoteCreated(savedQuote._id.toString(), creator);
            if (IMAGE_GENERATION_ENABLED) {
                void process.nextTick(() => {
                    (0, imageGeneration_queue_1.addImageGenerationJob)({ quoteId: savedQuote._id.toString() }).catch(err => {
                        console.error('Failed to enqueue image generation job:', err);
                    });
                });
            }
            return savedQuote;
        }
        catch (error) {
            void session.abortTransaction();
            void session.endSession();
            throw error;
        }
    }
    async getQuoteById(id) {
        return await this.quoteCache.getQuote(id, async () => {
            const quote = await this.quoteModel.findById(id);
            if (!quote) {
                throw new common_1.NotFoundException('Quote not found');
            }
            return quote;
        });
    }
    async getAllQuotes() {
        return await this.quoteModel.find();
    }
    async updateQuote(id, updateData) {
        const updatedQuote = await this.quoteModel.findByIdAndUpdate(id, updateData, { new: true });
        if (updatedQuote) {
            this.cacheInvalidation.emitQuoteUpdated(id);
            await this.quoteCache.warmUpQuoteCache(updatedQuote);
        }
        return updatedQuote;
    }
    async deleteQuote(id) {
        const quote = await this.quoteModel.findById(id);
        if (quote) {
            await this.quoteModel.findByIdAndDelete(id);
            this.cacheInvalidation.emitQuoteDeleted(id, quote.creator?.toString() || '');
            return quote;
        }
        return null;
    }
    async getQuotesByUser({ userId, cursor = null, limit = 20 }) {
        const query = { creator: userId };
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, 'createdAt', -1));
        }
        const quotes = await this.quoteModel.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(quotes, limit, ['createdAt']);
        return {
            quotes: data,
            pagination,
        };
    }
    async likeQuote(quoteId, _userId) {
        const quote = await this.quoteModel.findById(quoteId);
        if (!quote) {
            return null;
        }
        await this.quoteModel.findByIdAndUpdate(quoteId, { $inc: { likes: 1 } });
        const updatedQuote = await this.quoteModel.findById(quoteId);
        return { likeCount: updatedQuote?.likes || 0 };
    }
};
exports.QuotesService = QuotesService;
exports.QuotesService = QuotesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(quote_model_1.default.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_model_1.default.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        notifications_service_1.NotificationsService,
        quote_cache_1.QuoteCacheService,
        cache_invalidation_service_1.CacheInvalidationService])
], QuotesService);
//# sourceMappingURL=quotes.service.js.map
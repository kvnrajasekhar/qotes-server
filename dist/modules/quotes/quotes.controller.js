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
exports.QuotesController = void 0;
const common_1 = require("@nestjs/common");
const quotes_service_1 = require("./quotes.service");
const response_interceptor_1 = require("../../shared/interceptors/response.interceptor");
const auth_guard_1 = require("../../shared/guards/auth.guard");
let QuotesController = class QuotesController {
    constructor(quotesService) {
        this.quotesService = quotesService;
    }
    async createQuote(req, body) {
        const { text, author, category, hashtags, taggedUsers, isRequote = false, parentQuoteId = null, isHiddenBySystem = false, } = body;
        if (!isRequote && !text) {
            throw new Error('Quote text is required');
        }
        if (isRequote && !parentQuoteId) {
            throw new Error('Parent quote ID is required for requote');
        }
        const newQuote = await this.quotesService.createQuote({
            text: text || '',
            author,
            category: category || '',
            hashtags: hashtags || [],
            taggedUsers: taggedUsers || [],
            creator: req.user.userId,
            isRequote,
            parentQuoteId,
            isHiddenBySystem,
        });
        if (!newQuote) {
            throw new Error('Failed to create quote');
        }
        return {
            success: true,
            statusCode: 201,
            message: isRequote ? 'Requote created successfully' : 'Quote created successfully',
            data: newQuote,
        };
    }
    async getQuoteById(quoteId) {
        const quote = await this.quotesService.getQuoteById(quoteId);
        if (!quote) {
            throw new Error('Quote not found');
        }
        return {
            success: true,
            statusCode: 200,
            message: 'Quote retrieved successfully',
            data: quote,
        };
    }
    async getAllQuotes() {
        const quotes = await this.quotesService.getAllQuotes();
        return {
            success: true,
            statusCode: 200,
            message: 'Quotes retrieved successfully',
            data: quotes,
        };
    }
    async updateQuote(quoteId, updateData) {
        const updatedQuote = await this.quotesService.updateQuote(quoteId, updateData);
        if (!updatedQuote) {
            throw new Error('Quote not found or update failed');
        }
        return {
            success: true,
            statusCode: 200,
            message: 'Quote updated successfully',
            data: updatedQuote,
        };
    }
    async deleteQuote(quoteId) {
        const deletedQuote = await this.quotesService.deleteQuote(quoteId);
        if (!deletedQuote) {
            throw new Error('Quote not found or deletion failed');
        }
        return {
            success: true,
            statusCode: 200,
            message: 'Quote deleted successfully',
            data: deletedQuote,
        };
    }
    async getQuotesByUser(req, cursor, limit) {
        const userId = req.user.id;
        const userQuotes = await this.quotesService.getQuotesByUser({
            userId,
            cursor: cursor || null,
            limit: limit ? Number.parseInt(limit, 10) : 20,
        });
        if (!userQuotes) {
            throw new Error('No quotes found for this user');
        }
        return {
            success: true,
            statusCode: 200,
            message: 'User quotes retrieved successfully',
            data: userQuotes,
        };
    }
};
exports.QuotesController = QuotesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], QuotesController.prototype, "createQuote", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuotesController.prototype, "getQuoteById", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QuotesController.prototype, "getAllQuotes", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], QuotesController.prototype, "updateQuote", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuotesController.prototype, "deleteQuote", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('cursor')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], QuotesController.prototype, "getQuotesByUser", null);
exports.QuotesController = QuotesController = __decorate([
    (0, common_1.Controller)('quote'),
    (0, common_1.UseInterceptors)(response_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [quotes_service_1.QuotesService])
], QuotesController);
//# sourceMappingURL=quotes.controller.js.map
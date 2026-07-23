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
exports.CollectionsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const collections_model_1 = __importDefault(require("../../models/collections.model"));
const collectionItem_model_1 = __importDefault(require("../../models/collectionItem.model"));
const quote_model_1 = __importDefault(require("../../models/quote.model"));
const cursor_util_1 = require("../../shared/utils/cursor.util");
let CollectionsService = class CollectionsService {
    constructor(collectionModel, collectionItemModel, quoteModel) {
        this.collectionModel = collectionModel;
        this.collectionItemModel = collectionItemModel;
        this.quoteModel = quoteModel;
    }
    async getUserCollections({ userId, cursor = null, limit = 20, }) {
        const query = { owner: userId };
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, "createdAt", -1));
        }
        const collections = await this.collectionModel
            .find(query)
            .select("name isPrivate isDefault createdAt")
            .sort({ isDefault: -1, createdAt: -1 })
            .limit(limit + 1)
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(collections, limit, [
            "createdAt",
        ]);
        return {
            collections: data,
            pagination,
        };
    }
    async getCollectionDetails({ collectionId, cursor = null, limit = 20, }) {
        const query = { collectionId };
        if (cursor) {
            Object.assign(query, (0, cursor_util_1.buildCursorQuery)(cursor, "addedAt", -1));
        }
        const items = await this.collectionItemModel
            .find(query)
            .sort({ addedAt: -1 })
            .limit(limit + 1)
            .populate({
            path: "quoteId",
            select: "text author category reactions likes saves requotes createdAt",
        })
            .lean();
        const { data, pagination } = (0, cursor_util_1.processPaginatedResults)(items, limit, [
            "addedAt",
        ]);
        return {
            items: data.map((i) => i.quoteId),
            pagination,
        };
    }
    async toggleSave(userId, quoteId, collectionId = null) {
        let targetCollectionId = collectionId;
        if (!targetCollectionId) {
            let defaultCollection = await this.collectionModel.findOne({
                owner: userId,
                isDefault: true,
            });
            if (!defaultCollection) {
                defaultCollection = await this.collectionModel.create({
                    owner: userId,
                    name: "Saved",
                    isPrivate: true,
                    isDefault: true,
                });
            }
            targetCollectionId = defaultCollection._id.toString();
        }
        else {
            const isOwner = await this.collectionModel.exists({
                _id: targetCollectionId,
                owner: userId,
            });
            if (!isOwner)
                throw new common_1.UnauthorizedException("Unauthorized");
        }
        const existing = await this.collectionItemModel.findOne({
            collectionId: targetCollectionId,
            quoteId,
        });
        if (existing) {
            await this.collectionItemModel.deleteOne({ _id: existing._id });
            await this.quoteModel.findByIdAndUpdate(quoteId, { $inc: { saves: -1 } });
            return { saved: false };
        }
        await this.collectionItemModel.create({
            collectionId: targetCollectionId,
            quoteId,
        });
        await this.quoteModel.findByIdAndUpdate(quoteId, { $inc: { saves: 1 } });
        return { saved: true };
    }
};
exports.CollectionsService = CollectionsService;
exports.CollectionsService = CollectionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(collections_model_1.default.name)),
    __param(1, (0, mongoose_1.InjectModel)(collectionItem_model_1.default.name)),
    __param(2, (0, mongoose_1.InjectModel)(quote_model_1.default.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], CollectionsService);
//# sourceMappingURL=collections.service.js.map
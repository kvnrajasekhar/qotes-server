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
exports.PreferencesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const userContentPreference_model_1 = __importDefault(require("../../models/userContentPreference.model"));
let PreferencesService = class PreferencesService {
    constructor(preferenceModel) {
        this.preferenceModel = preferenceModel;
    }
    async savePreference({ userId, type, targetId, reason }) {
        if (!['QUOTE', 'AUTHOR', 'TAG'].includes(type)) {
            throw new common_1.BadRequestException('Invalid type');
        }
        return await this.preferenceModel.updateOne({ userId, type, targetId }, {
            $set: { reason, updatedAt: new Date() },
            $setOnInsert: { createdAt: new Date() },
        }, { upsert: true });
    }
};
exports.PreferencesService = PreferencesService;
exports.PreferencesService = PreferencesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(userContentPreference_model_1.default.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], PreferencesService);
//# sourceMappingURL=preferences.service.js.map
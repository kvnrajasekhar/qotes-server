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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const users_service_1 = require("./users.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const response_interceptor_1 = require("../../shared/interceptors/response.interceptor");
const multerConfig = {
    storage: (0, multer_1.diskStorage)({
        destination: "./uploads",
        filename: (req, file, cb) => {
            const randomName = Array(32)
                .fill(null)
                .map(() => Math.round(Math.random() * 16).toString(16))
                .join("");
            cb(null, `${randomName}${(0, path_1.extname)(file.originalname)}`);
        },
    }),
};
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getSuggestedUsers(req, limit) {
        const userId = req.user?.id || null;
        const parsedLimit = parseInt(limit) || 8;
        const suggestedUsers = await this.usersService.getSuggestedUsers({
            userId,
            limit: parsedLimit,
        });
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "Suggested users retrieved successfully",
            data: suggestedUsers,
        };
    }
    async getPublicSuggestedUsers(limit) {
        const parsedLimit = parseInt(limit) || 8;
        const suggestedUsers = await this.usersService.getSuggestedUsers({
            userId: null,
            limit: parsedLimit,
        });
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "Public suggested users retrieved successfully",
            data: suggestedUsers,
        };
    }
    async getUserByUsername(username, req) {
        const user = await this.usersService.getUserByUsername(username, req.user ? req.user.id : null);
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "User retrieved successfully",
            data: user,
        };
    }
    async getProfile(req) {
        const userId = req.user.id;
        const user = await this.usersService.getUserByUsername(userId);
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "User profile retrieved successfully",
            data: user,
        };
    }
    async updateProfile(req, body) {
        const userId = req.user.id;
        const { firstName, lastName, email } = body;
        const updateUserProfile = await this.usersService.updateUserProfile(userId, {
            firstName,
            lastName,
            email,
        });
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "User profile updated successfully",
            data: updateUserProfile,
        };
    }
    async updateAvatar(req, avatarFile) {
        const userId = req.user.userId;
        if (!avatarFile) {
            throw new Error("No image file uploaded.");
        }
        const updatedUser = await this.usersService.updateUserAvatar(userId, avatarFile);
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "Avatar updated successfully.",
            data: { avatarUrl: updatedUser.avatarUrl },
        };
    }
    async toggleFollow(req, targetId) {
        const followerId = req.user.userId;
        const result = await this.usersService.toggleFollow(followerId, targetId);
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: result.message,
            data: { followed: result.followed },
        };
    }
    async getRequotes(userId, req, cursor, limit) {
        const targetUserId = userId === "me" ? req.user.id : userId;
        const data = await this.usersService.getUserRequotes({
            userId: targetUserId,
            cursor,
            limit: parseInt(limit) || 20,
        });
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "Requotes fetched",
            data,
        };
    }
    async getMyFollowing(req, cursor, limit) {
        const userId = req.user.id;
        const currentUserId = req.user.id;
        const data = await this.usersService.getFollowing({
            userId,
            currentUserId,
            cursor,
            limit: parseInt(limit) || 20,
        });
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "Following fetched",
            data,
        };
    }
    async getMyFollowers(req, cursor, limit) {
        const userId = req.user.id;
        const currentUserId = req.user.id;
        const data = await this.usersService.getFollowers({
            userId,
            currentUserId,
            cursor,
            limit: parseInt(limit) || 20,
        });
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "Followers fetched",
            data,
        };
    }
    async getUserFollowers(userId, req, cursor, limit) {
        const currentUserId = req.user.id;
        const data = await this.usersService.getFollowers({
            userId,
            currentUserId,
            cursor,
            limit: parseInt(limit) || 20,
        });
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "Followers fetched",
            data,
        };
    }
    async getUserFollowing(userId, req, cursor, limit) {
        const currentUserId = req.user.id;
        const data = await this.usersService.getFollowing({
            userId,
            currentUserId,
            cursor,
            limit: parseInt(limit) || 20,
        });
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "Following fetched",
            data,
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)("suggested"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSuggestedUsers", null);
__decorate([
    (0, common_1.Get)("suggested/public"),
    __param(0, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getPublicSuggestedUsers", null);
__decorate([
    (0, common_1.Get)("u/:username"),
    __param(0, (0, common_1.Param)("username")),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserByUsername", null);
__decorate([
    (0, common_1.Get)("profile/me"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)("profile/me"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Put)("avatar"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("avatar", multerConfig)),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateAvatar", null);
__decorate([
    (0, common_1.Post)("follow/:id"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "toggleFollow", null);
__decorate([
    (0, common_1.Get)(":userId/requotes"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)("cursor")),
    __param(3, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getRequotes", null);
__decorate([
    (0, common_1.Get)("me/following"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("cursor")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMyFollowing", null);
__decorate([
    (0, common_1.Get)("me/followers"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("cursor")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMyFollowers", null);
__decorate([
    (0, common_1.Get)(":userId/followers"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)("cursor")),
    __param(3, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserFollowers", null);
__decorate([
    (0, common_1.Get)(":userId/following"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)("cursor")),
    __param(3, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUserFollowing", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)("user"),
    (0, common_1.UseInterceptors)(response_interceptor_1.ResponseInterceptor),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map
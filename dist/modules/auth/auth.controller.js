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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const auth_service_1 = require("./auth.service");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
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
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async login(req, res) {
        const { identifier, password } = req.body;
        const result = await this.authService.login(identifier, password);
        if (!result) {
            throw new Error("Invalid credentials");
        }
        res.cookie("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.status(common_1.HttpStatus.OK).json({
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "Login successful",
            data: {
                accessToken: result.accessToken,
                userId: result.userId,
            },
        });
    }
    async signup(req) {
        const { username, email, password, firstName, lastName, bio } = req.body;
        const avatarFile = req.file || null;
        const existingUser = await this.authService.findUserByUsernameOrEmail(username);
        if (existingUser) {
            throw new Error("Username already exists");
        }
        const bcrypt = require("bcryptjs");
        const hashedPassword = await bcrypt.hash(password, 10);
        await this.authService.saveUser(username, email, hashedPassword, firstName, lastName, bio, avatarFile);
        return {
            success: true,
            statusCode: common_1.HttpStatus.CREATED,
            message: "User registered successfully",
            data: {},
        };
    }
    async logout(req, res) {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            await this.authService.deleteRefreshToken(refreshToken);
        }
        res.clearCookie("refreshToken");
        return res.status(common_1.HttpStatus.OK).json({
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "Logged out successfully",
            data: {},
        });
    }
    async refresh(req) {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            throw new Error("Refresh token not found");
        }
        const { accessToken } = await this.authService.refreshAccessToken(refreshToken);
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: "Token refreshed successfully",
            data: { accessToken },
        };
    }
    async forgotPassword(body) {
        const { email } = body;
        const result = await this.authService.generateResetTokenAndSendEmail(email);
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: result.message,
            data: {},
        };
    }
    async resetPassword(userId, token, body) {
        const { newPassword, cnfPassword } = body;
        const result = await this.authService.resetPasswordWithToken(userId, token, newPassword, cnfPassword);
        return {
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: result.message,
            data: {},
        };
    }
    async updatePassword(req, res, body) {
        const userId = req.user.userId;
        const { oldPassword, newPassword, confirmPassword } = body;
        const result = await this.authService.updateUserPassword(userId, oldPassword, newPassword, confirmPassword);
        res.clearCookie("refreshToken");
        return res.status(common_1.HttpStatus.OK).json({
            success: true,
            statusCode: common_1.HttpStatus.OK,
            message: result.message,
            data: {},
        });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)("login"),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)("signup"),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("avatar", multerConfig)),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signup", null);
__decorate([
    (0, common_1.Post)("logout"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)("refresh"),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)("forgot-password"),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)("forgotpassword/:userId/:token"),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)("userId")),
    __param(1, (0, common_1.Param)("token")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)("update-password"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updatePassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)("auth"),
    (0, common_1.UseInterceptors)(response_interceptor_1.ResponseInterceptor),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map
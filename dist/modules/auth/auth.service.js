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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const fs_1 = require("fs");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_model_1 = __importDefault(require("../../models/user.model"));
const token_model_1 = __importDefault(require("../../models/token.model"));
const forgotPasswordMailer_1 = require("../../infrastructure/mailer/forgotPasswordMailer");
const common_2 = require("@nestjs/common");
let AuthService = class AuthService {
    constructor(userModel, tokenModel, jwtService, configService, cloudinaryService, kafkaProducer) {
        this.userModel = userModel;
        this.tokenModel = tokenModel;
        this.jwtService = jwtService;
        this.configService = configService;
        this.cloudinaryService = cloudinaryService;
        this.kafkaProducer = kafkaProducer;
    }
    async findUserByUsernameOrEmail(identifier) {
        return await this.userModel
            .findOne({
            $or: [{ username: identifier }, { email: identifier }],
        })
            .select("+password");
    }
    async login(identifier, password) {
        const user = await this.findUserByUsernameOrEmail(identifier);
        if (!user)
            return null;
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword)
            return null;
        const JWT_SECRET = this.configService.get("JWT_SECRET");
        const REFRESH_SECRET = this.configService.get("REFRESH_SECRET");
        const payload = {
            userId: user._id,
            username: user.username,
        };
        const accessToken = this.jwtService.sign(payload, { expiresIn: "25m" });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user._id }, REFRESH_SECRET || "", {
            expiresIn: "7d",
        });
        await this.saveRefreshToken(user._id.toString(), refreshToken);
        try {
            await this.kafkaProducer.send({
                topic: "auth-events",
                messages: [
                    {
                        key: user._id.toString(),
                        value: JSON.stringify({ userId: user._id, action: "login_warmup" }),
                    },
                ],
            });
        }
        catch (kafkaErr) {
            console.error("Cache warm-up trigger failed:", kafkaErr);
        }
        return {
            accessToken,
            refreshToken,
            userId: user._id,
        };
    }
    async saveUser(username, email, hashedPassword, firstName, lastName, bio, avatarFile) {
        let avatarUrl = null;
        let filePath = avatarFile ? avatarFile.path : null;
        try {
            if (avatarFile) {
                avatarUrl = await this.cloudinaryService.uploadImage(filePath);
            }
            const newUser = new this.userModel({
                username,
                email,
                password: hashedPassword,
                firstName,
                lastName,
                bio,
                avatarUrl: avatarUrl,
            });
            const savedUser = await newUser.save();
            if (filePath)
                await fs_1.promises.unlink(filePath);
            return savedUser;
        }
        catch (error) {
            if (filePath) {
                await fs_1.promises
                    .unlink(filePath)
                    .catch((err) => console.error("Cleanup error after service failure:", err));
            }
            throw error;
        }
    }
    async saveRefreshToken(userId, token) {
        await this.tokenModel.deleteMany({ userId: userId });
        const newToken = new this.tokenModel({ userId, refreshToken: token });
        return await newToken.save();
    }
    async savePasswordResetToken(userId, token, expiresAt) {
        const resetToken = new this.tokenModel({
            userId,
            passwordResetToken: token,
            expiresAt,
        });
        return await resetToken.save();
    }
    async deleteRefreshToken(token) {
        return await this.tokenModel.deleteOne({ refreshToken: token });
    }
    async findToken(token) {
        return await this.tokenModel.findOne({ refreshToken: token });
    }
    async findUserById(userId) {
        return await this.userModel.findById(userId).select("+password");
    }
    async refreshAccessToken(refreshToken) {
        let decoded;
        const REFRESH_SECRET = this.configService.get("REFRESH_SECRET");
        try {
            decoded = jsonwebtoken_1.default.verify(refreshToken, REFRESH_SECRET || "");
        }
        catch (err) {
            throw new common_1.UnauthorizedException("Expired or invalid refresh token");
        }
        const userId = decoded.userId;
        const tokenRecord = await this.findToken(refreshToken);
        if (!tokenRecord || tokenRecord.userId.toString() !== userId) {
            throw new common_1.UnauthorizedException("Invalid refresh token state");
        }
        const user = await this.findUserById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException("User not found");
        }
        const newAccessToken = this.jwtService.sign({ userId: user._id, username: user.username }, { expiresIn: "15m" });
        return { accessToken: newAccessToken };
    }
    async generateResetTokenAndSendEmail(email) {
        const user = await this.userModel.findOne({ email }).select("+password");
        if (!user) {
            return { success: true, message: "If account exists, email sent" };
        }
        const JWT_SECRET = this.configService.get("JWT_SECRET");
        const LOCALHOST = this.configService.get("LOCALHOST") || "http://localhost:3030";
        const secret = JWT_SECRET + user.password;
        const payload = {
            email: user.email,
            id: user._id,
        };
        const token = jsonwebtoken_1.default.sign(payload, secret, {
            expiresIn: "15m",
        });
        const link = `${LOCALHOST}/forgotpassword/${user._id}/${token}`;
        (0, forgotPasswordMailer_1.forgotPasswordLink)(user.email, link);
        return {
            success: true,
            message: "A password reset link has been sent to your email",
        };
    }
    async resetPasswordWithToken(userId, token, newPassword, cnfPassword) {
        if (newPassword !== cnfPassword) {
            throw new common_1.BadRequestException("Passwords didn't match");
        }
        const validUser = await this.userModel
            .findOne({ _id: userId })
            .select("+password");
        if (!validUser) {
            throw new common_1.NotFoundException("Invalid reset link. User not found.");
        }
        const JWT_SECRET = this.configService.get("JWT_SECRET");
        const secret = JWT_SECRET + validUser.password;
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(token, secret);
        }
        catch (error) {
            throw new common_1.BadRequestException("Password reset link is invalid or has expired");
        }
        const hashPassword = await bcryptjs_1.default.hash(newPassword, 10);
        const user = await this.userModel.findOneAndUpdate({ _id: payload.id, email: payload.email }, { password: hashPassword }, { new: true });
        if (!user) {
            throw new common_1.NotFoundException("User not found during update");
        }
        return { success: true, message: "Password updated successfully" };
    }
    async updateUserPassword(userId, oldPassword, newPassword, confirmPassword) {
        const user = await this.userModel.findById(userId).select("+password");
        if (!user) {
            throw new common_1.NotFoundException("User account not found.");
        }
        const isMatch = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isMatch) {
            throw new common_1.BadRequestException("Current password incorrect.");
        }
        if (newPassword !== confirmPassword) {
            throw new common_1.BadRequestException("New passwords do not match.");
        }
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await this.userModel.findByIdAndUpdate(userId, { $set: { password: hashedNewPassword } }, { new: true });
        await this.tokenModel.deleteMany({ userId: userId });
        return {
            success: true,
            message: "Password updated successfully. Please log in again.",
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_model_1.default.name)),
    __param(1, (0, mongoose_1.InjectModel)(token_model_1.default.name)),
    __param(4, (0, common_2.Inject)("CLOUDINARY_SERVICE")),
    __param(5, (0, common_2.Inject)("KAFKA_PRODUCER")),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        jwt_1.JwtService,
        config_1.ConfigService, Object, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map
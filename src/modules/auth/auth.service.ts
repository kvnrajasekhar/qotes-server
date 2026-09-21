import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Producer } from 'kafkajs';

import  { IUser } from '../../models/user.model';
import  { IToken } from '../../models/token.model';
import { forgotPasswordLink } from '../../infrastructure/mailer/forgotPasswordMailer';
import { CloudinaryService } from '../../infrastructure/media/cloudinary.service';
import { Inject } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel("User") private userModel: Model<IUser>,
    @InjectModel("Token") private tokenModel: Model<IToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject('CLOUDINARY_SERVICE') private cloudinaryService: CloudinaryService,
    @Inject('KAFKA_PRODUCER') private kafkaProducer: Producer
  ) { }

  async findUserByUsernameOrEmail(identifier: string) {
    return await this.userModel
      .findOne({
        $or: [{ username: identifier }, { email: identifier }],
      })
      .select('+password');
  }

  async login(identifier: string, password: string) {
    const user = await this.findUserByUsernameOrEmail(identifier);
    if (!user) return null;

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return null;

    const REFRESH_SECRET = this.configService.get('REFRESH_SECRET');

    const payload = {
      userId: user._id,
      username: user.username,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '25m' });
    const refreshToken = jwt.sign({ userId: user._id }, REFRESH_SECRET || '', {
      expiresIn: '7d',
    });

    await this.saveRefreshToken(user._id.toString(), refreshToken);

    try {
      await this.kafkaProducer.send({
        topic: 'auth-events',
        messages: [
          {
            key: user._id.toString(),
            value: JSON.stringify({ userId: user._id, action: 'login_warmup' }),
          },
        ],
      });
    } catch (kafkaErr: unknown) {
      console.error('Cache warm-up trigger failed:', kafkaErr);
    }

    return {
      accessToken,
      refreshToken,
      userId: user._id,
    };
  }
  
  async saveUser(
    username: string,
    email: string,
    hashedPassword: string,
    firstName: string,
    lastName: string,
    bio: string,
    avatarFile?: Express.Multer.File | null
  ) {
    let avatarUrl: string | null = null;
    const filePath = avatarFile?.path || null;

    try {
      // 1. ONLY upload if a physical file path or buffer actually exists
      if (avatarFile && filePath) {
        avatarUrl = await this.cloudinaryService.uploadImage(filePath);
      }

      // 2. Initialize document with all required schema stats & defaults
      const newUser = new this.userModel({
        username,
        email,
        password: hashedPassword,
        firstName: firstName || "",
        lastName: lastName || "",
        bio: bio || "",
        avatarUrl: avatarUrl || "",
        stats: {
          followerCount: 0,
          followingCount: 0,
          quoteCount: 0,
        },
        isBanned: false,
      });

      const savedUser = await newUser.save();

      // 3. Clean up temporary uploaded file if it was saved to disk
      if (filePath) {
        await fs.unlink(filePath).catch((err) => {
          console.warn("Non-fatal: temp file deletion skipped:", err.message);
        });
      }

      return savedUser;
    } catch (error: any) {
      // Clean up file if error occurs
      if (filePath) {
        await fs.unlink(filePath).catch(() => { });
      }

      console.error("CRITICAL ERROR inside saveUser:", error?.message || error);
      throw new InternalServerErrorException(
        error?.message || "Failed to create user account"
      );
    }
  }

  async saveRefreshToken(userId: string, token: string) {
    await this.tokenModel.deleteMany({ userId: userId });
    const newToken = new this.tokenModel({ userId, refreshToken: token });
    return await newToken.save();
  }

  async savePasswordResetToken(userId: string, token: string, expiresAt: Date) {
    const resetToken = new this.tokenModel({
      userId,
      passwordResetToken: token,
      expiresAt,
    });
    return await resetToken.save();
  }

  async deleteRefreshToken(token: string) {
    return await this.tokenModel.deleteOne({ refreshToken: token });
  }

  async findToken(token: string) {
    return await this.tokenModel.findOne({ refreshToken: token });
  }

  async findUserById(userId: string) {
    return await this.userModel.findById(userId).select('+password');
  }

  async refreshAccessToken(refreshToken: string) {
    let decoded: string | JwtPayload;
    const REFRESH_SECRET = this.configService.get('REFRESH_SECRET');

    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET || '');
    } catch {
      throw new UnauthorizedException('Expired or invalid refresh token');
    }

    const userId = typeof decoded === 'object' && decoded && 'userId' in decoded ? decoded.userId : undefined;
    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const tokenRecord = await this.findToken(refreshToken);
    if (!tokenRecord || tokenRecord.userId.toString() !== userId) {
      throw new UnauthorizedException('Invalid refresh token state');
    }

    const user = await this.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newAccessToken = this.jwtService.sign(
      { userId: user._id, username: user.username },
      { expiresIn: '15m' }
    );

    return { accessToken: newAccessToken };
  }

  async generateResetTokenAndSendEmail(email: string) {
    const user = await this.userModel.findOne({ email }).select('+password');

    if (!user) {
      return { success: true, message: 'If account exists, email sent' };
    }
    const JWT_SECRET = this.configService.get('JWT_SECRET');
    const LOCALHOST = this.configService.get('LOCALHOST') || 'http://localhost:3030';
    const secret = JWT_SECRET + user.password;

    const payload = {
      email: user.email,
      id: user._id,
    };

    const token = jwt.sign(payload, secret, {
      expiresIn: '15m',
    });

    const link = `${LOCALHOST}/forgotpassword/${user._id}/${token}`;

    await forgotPasswordLink(user.email, link);

    return {
      success: true,
      message: 'A password reset link has been sent to your email',
    };
  }

  async resetPasswordWithToken(
    userId: string,
    token: string,
    newPassword: string,
    cnfPassword: string
  ) {
    if (newPassword !== cnfPassword) {
      throw new BadRequestException("Passwords didn't match");
    }

    const validUser = await this.userModel.findOne({ _id: userId }).select('+password');

    if (!validUser) {
      throw new NotFoundException('Invalid reset link. User not found.');
    }

    const JWT_SECRET = this.configService.get('JWT_SECRET');
    const secret = JWT_SECRET + validUser.password;
    let payload: string | JwtPayload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      throw new BadRequestException('Password reset link is invalid or has expired');
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);

    if (typeof payload !== 'object' || payload === null || !('id' in payload) || !('email' in payload)) {
      throw new BadRequestException('Password reset token payload is invalid');
    }

    const user = await this.userModel.findOneAndUpdate(
      { _id: payload.id, email: payload.email },
      { password: hashPassword },
      { new: true }
    );

    if (!user) {
      throw new NotFoundException('User not found during update');
    }

    return { success: true, message: 'Password updated successfully' };
  }

  async updateUserPassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    confirmPassword: string
  ) {
    const user = await this.userModel.findById(userId).select('+password');

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      throw new BadRequestException('Current password incorrect.');
    }
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New passwords do not match.');
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { password: hashedNewPassword } },
      { new: true }
    );

    await this.tokenModel.deleteMany({ userId: userId });

    return {
      success: true,
      message: 'Password updated successfully. Please log in again.',
    };
  }
}

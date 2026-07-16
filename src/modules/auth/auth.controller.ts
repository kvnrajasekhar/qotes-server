import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UseFilters,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { ResponseInterceptor } from "../../shared/interceptors/response.interceptor";
import { HttpExceptionFilter } from "../../shared/filters/http-exception.filter";

// Multer configuration for file uploads
const multerConfig = {
  storage: diskStorage({
    destination: "./uploads",
    filename: (req: any, file: any, cb: any) => {
      const randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join("");
      cb(null, `${randomName}${extname(file.originalname)}`);
    },
  }),
};

@Controller("auth")
@UseInterceptors(ResponseInterceptor)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request, @Res() res: Response) {
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

    return res.status(HttpStatus.OK).json({
      success: true,
      statusCode: HttpStatus.OK,
      message: "Login successful",
      data: {
        accessToken: result.accessToken,
        userId: result.userId,
      },
    });
  }

  @Post("signup")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("avatar", multerConfig))
  async signup(@Req() req: Request) {
    const { username, email, password, firstName, lastName, bio } = req.body;
    const avatarFile = req.file || null;

    const existingUser =
      await this.authService.findUserByUsernameOrEmail(username);

    if (existingUser) {
      throw new Error("Username already exists");
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.authService.saveUser(
      username,
      email,
      hashedPassword,
      firstName,
      lastName,
      bio,
      avatarFile,
    );

    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: "User registered successfully",
      data: {},
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await this.authService.deleteRefreshToken(refreshToken);
    }

    res.clearCookie("refreshToken");
    return res.status(HttpStatus.OK).json({
      success: true,
      statusCode: HttpStatus.OK,
      message: "Logged out successfully",
      data: {},
    });
  }

  @Post("refresh")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new Error("Refresh token not found");
    }

    const { accessToken } =
      await this.authService.refreshAccessToken(refreshToken);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Token refreshed successfully",
      data: { accessToken },
    };
  }

  @Post("forgot-password")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    const { email } = body;
    const result = await this.authService.generateResetTokenAndSendEmail(email);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: result.message,
      data: {},
    };
  }

  @Post("forgotpassword/:userId/:token")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param("userId") userId: string,
    @Param("token") token: string,
    @Body() body: { newPassword: string; cnfPassword: string },
  ) {
    const { newPassword, cnfPassword } = body;
    const result = await this.authService.resetPasswordWithToken(
      userId,
      token,
      newPassword,
      cnfPassword,
    );

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: result.message,
      data: {},
    };
  }

  @Post("update-password")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @Req() req: Request,
    @Res() res: Response,
    @Body()
    body: { oldPassword: string; newPassword: string; confirmPassword: string },
  ) {
    const userId = req.user.userId;
    const { oldPassword, newPassword, confirmPassword } = body;

    const result = await this.authService.updateUserPassword(
      userId,
      oldPassword,
      newPassword,
      confirmPassword,
    );

    res.clearCookie("refreshToken");

    return res.status(HttpStatus.OK).json({
      success: true,
      statusCode: HttpStatus.OK,
      message: result.message,
      data: {},
    });
  }
}

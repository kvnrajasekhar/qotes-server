import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseInterceptor } from '../../shared/interceptors/response.interceptor';
import { AuthenticatedRequest } from '../../shared/interfaces/authenticated-request.interface';

const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (
      req: Express.Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename?: string) => void
    ) => {
      const randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');
      cb(null, `${randomName}${extname(file.originalname)}`);
    },
  }),
};

@Controller('user')
@UseInterceptors(ResponseInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: AuthenticatedRequest) {
    const currentUserId = req.user?.userId || req.user?.id || req.user?._id;

    if (!currentUserId) {
      throw new UnauthorizedException('Unauthorized: Invalid token payload');
    }

    const user = await this.usersService.findUserById(currentUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User profile retrieved successfully',
      data: user,
    };
  }

  @Patch('profile/me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() body: Partial<{ firstName?: string; lastName?: string; email?: string }>
  ) {
    const userId = req.user?.userId || req.user?.id;
    const { firstName, lastName, email } = body;

    const updatedUserProfile = await this.usersService.updateUserProfile(userId, {
      firstName,
      lastName,
      email,
    });

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User profile updated successfully',
      data: updatedUserProfile,
    };
  }

  @Put('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  async updateAvatar(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() avatarFile: Express.Multer.File
  ) {
    const userId = req.user?.userId || req.user?.id;

    if (!avatarFile) {
      throw new BadRequestException('No image file uploaded.');
    }

    const updatedUser = await this.usersService.updateUserAvatar(userId, avatarFile);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Avatar updated successfully.',
      data: { avatarUrl: updatedUser.avatarUrl },
    };
  }

  @Get('suggested')
  @UseGuards(JwtAuthGuard)
  async getSuggestedUsers(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
    const userId = req.user?.userId || req.user?.id || null;
    const parsedLimit = parseInt(limit || '8', 10) || 8;

    const suggestedUsers = await this.usersService.getSuggestedUsers({
      userId,
      limit: parsedLimit,
    });

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Suggested users retrieved successfully',
      data: suggestedUsers,
    };
  }

  @Get('suggested/public')
  async getPublicSuggestedUsers(@Query('limit') limit?: string) {
    const parsedLimit = parseInt(limit || '8', 10) || 8;

    const suggestedUsers = await this.usersService.getSuggestedUsers({
      userId: null,
      limit: parsedLimit,
    });

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Public suggested users retrieved successfully',
      data: suggestedUsers,
    };
  }

  @Get('u/:username')
  async getUserByUsername(@Param('username') username: string, @Req() req: AuthenticatedRequest) {
    const viewerId = req.user?.userId || req.user?.id || null;
    const user = await this.usersService.getUserByUsername(username, viewerId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User retrieved successfully',
      data: user,
    };
  }

  @Post('follow/:id')
  @UseGuards(JwtAuthGuard)
  async toggleFollow(@Req() req: AuthenticatedRequest, @Param('id') targetId: string) {
    const followerId = req.user?.userId || req.user?.id;
    const result = await this.usersService.toggleFollow(followerId, targetId);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: result.message,
      data: { followed: result.followed },
    };
  }

  @Get('me/following')
  @UseGuards(JwtAuthGuard)
  async getMyFollowing(
    @Req() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    const currentUserId = req.user?.userId || req.user?.id;
    const data = await this.usersService.getFollowing({
      userId: currentUserId,
      currentUserId,
      cursor,
      limit: parseInt(limit || '20', 10) || 20,
    });

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Following fetched',
      data,
    };
  }

  @Get('me/followers')
  @UseGuards(JwtAuthGuard)
  async getMyFollowers(
    @Req() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    const currentUserId = req.user?.userId || req.user?.id;
    const data = await this.usersService.getFollowers({
      userId: currentUserId,
      currentUserId,
      cursor,
      limit: parseInt(limit || '20', 10) || 20,
    });

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Followers fetched',
      data,
    };
  }

  @Get(':userId/requotes')
  @UseGuards(JwtAuthGuard)
  async getRequotes(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    const currentUserId = req.user?.userId || req.user?.id;
    const targetUserId = userId === 'me' ? currentUserId : userId;

    const data = await this.usersService.getUserRequotes({
      userId: targetUserId,
      cursor,
      limit: parseInt(limit || '20', 10) || 20,
    });

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Requotes fetched',
      data,
    };
  }

  @Get(':userId/followers')
  @UseGuards(JwtAuthGuard)
  async getUserFollowers(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    const currentUserId = req.user?.userId || req.user?.id;
    const data = await this.usersService.getFollowers({
      userId,
      currentUserId,
      cursor,
      limit: parseInt(limit || '20', 10) || 20,
    });

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Followers fetched',
      data,
    };
  }

  @Get(':userId/following')
  @UseGuards(JwtAuthGuard)
  async getUserFollowing(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    const currentUserId = req.user?.userId || req.user?.id;
    const data = await this.usersService.getFollowing({
      userId,
      currentUserId,
      cursor,
      limit: parseInt(limit || '20', 10) || 20,
    });

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Following fetched',
      data,
    };
  }
}

import { Controller, UseInterceptors, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { FeedsService } from './feeds.service';
import { ResponseInterceptor } from '../../shared/interceptors/response.interceptor';
import { AuthGuard } from '../../shared/guards/auth.guard';

@Controller('feed')
@UseInterceptors(ResponseInterceptor)
@UseGuards(AuthGuard)
export class FeedsController {
  constructor(private feedsService: FeedsService) {}

  @Get()
  async getGlobalFeed(@Request() req: any, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const result = await this.feedsService.getGlobalFeed({
      userId: req.user._id,
      cursor: cursor || null,
      limit: parseInt(limit as string) || 10,
    });
    return {
      success: true,
      statusCode: 200,
      message: 'Quotes retrieved successfully',
      data: result,
    };
  }

  @Get('following')
  async getFollowingFeed(@Request() req: any, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const result = await this.feedsService.getFollowingFeed({
      userId: req.user._id,
      cursor,
      limit: parseInt(limit as string, 10) || 10,
    });
    return {
      success: true,
      statusCode: 200,
      message: 'Feed loaded',
      data: result,
    };
  }

  @Get('discover')
  async getDiscoverFeed(@Request() req: any, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const result = await this.feedsService.getDiscoverFeed({
      userId: req.user._id,
      cursor,
      limit: parseInt(limit as string, 10) || 10,
    });
    return {
      success: true,
      statusCode: 200,
      message: 'Discover feed loaded',
      data: result,
    };
  }

  @Get('q/:targetuserId')
  async getUserQuotes(@Request() req: any, @Param('targetuserId') targetuserId: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const result = await this.feedsService.getUserQuotes({
      targetUserId: targetuserId,
      viewerId: req.user._id,
      cursor: cursor || null,
      limit: parseInt(limit as string) || 10,
    });
    return {
      success: true,
      statusCode: 200,
      message: 'User quotes retrieved successfully',
      data: result,
    };
  }
}

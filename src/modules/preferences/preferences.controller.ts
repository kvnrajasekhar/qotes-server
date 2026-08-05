import { Controller, UseInterceptors, Post, UseGuards, Request, Body } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { ResponseInterceptor } from '../../shared/interceptors/response.interceptor';
import { AuthGuard } from '../../shared/guards/auth.guard';

@Controller('preferences')
@UseInterceptors(ResponseInterceptor)
@UseGuards(AuthGuard)
export class PreferencesController {
  constructor(private preferencesService: PreferencesService) {}

  @Post('not-interested')
  async saveNotInterested(@Request() req: any, @Body() body: { type: string; targetId: string; reason?: string }) {
    const { type, targetId, reason } = body;
    const userId = req.user?.id;

    const preference = await this.preferencesService.savePreference({
      userId,
      type,
      targetId,
      reason: reason || 'NOT_INTERESTED',
    });

    return {
      success: true,
      statusCode: 201,
      message: `We'll show you less of this ${type.toLowerCase()}.`,
      data: preference,
    };
  }
}

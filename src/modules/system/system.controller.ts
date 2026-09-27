import { Controller, Get } from '@nestjs/common';
import { SystemService } from './system.service';

@Controller()
export class RootController {
  @Get()
  getRoot() {
    return {
      message:
        'Qotes API is running, check /system/health for health status and /system/ready for readiness status. And read docs/API_SPEC.md for more details.',
      service: 'qotes-api',
      status: 'ok',
    };
  }
}

@Controller('system')
export class SystemController {
  constructor(private systemService: SystemService) {}

  @Get('health')
  healthCheck() {
    return this.systemService.healthCheck();
  }

  @Get('ready')
  readyCheck() {
    return this.systemService.readyCheck();
  }

  @Get('metrics')
  metrics() {
    return this.systemService.getMetrics();
  }
}

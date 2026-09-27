import { Module } from '@nestjs/common';

import { RootController, SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  controllers: [RootController, SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}

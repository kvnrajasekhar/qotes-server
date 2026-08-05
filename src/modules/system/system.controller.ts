import { Controller, Get } from "@nestjs/common";
import { SystemService } from "./system.service";

@Controller("system")
export class SystemController {
  constructor(private systemService: SystemService) { }

  @Get("health")
  healthCheck() {
    return this.systemService.healthCheck();
  }

  @Get("ready")
  readyCheck() {
    return this.systemService.readyCheck();
  }

  @Get("metrics")
  metrics() {
    return this.systemService.getMetrics();
  }
}

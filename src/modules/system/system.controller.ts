import { Controller, UseInterceptors, Get } from "@nestjs/common";
import { SystemService } from "./system.service";
import { ResponseInterceptor } from "../../shared/interceptors/response.interceptor";

@Controller("system")
@UseInterceptors(ResponseInterceptor)
export class SystemController {
  constructor(private systemService: SystemService) {}

  @Get("health")
  healthCheck() {
    return this.systemService.healthCheck();
  }
}

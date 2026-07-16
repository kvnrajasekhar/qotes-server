import { Controller, UseInterceptors } from "@nestjs/common";
import { SafetyService } from "./safety.service";
import { ResponseInterceptor } from "../../shared/interceptors/response.interceptor";

@Controller("safety")
@UseInterceptors(ResponseInterceptor)
export class SafetyController {
  constructor(private safetyService: SafetyService) {}
}

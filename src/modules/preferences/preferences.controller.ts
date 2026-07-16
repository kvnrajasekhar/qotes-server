import { Controller, UseInterceptors } from "@nestjs/common";
import { PreferencesService } from "./preferences.service";
import { ResponseInterceptor } from "../../shared/interceptors/response.interceptor";

@Controller("preferences")
@UseInterceptors(ResponseInterceptor)
export class PreferencesController {
  constructor(private preferencesService: PreferencesService) {}
}

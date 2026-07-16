import { Controller, UseInterceptors } from "@nestjs/common";
import { ReactionsService } from "./reactions.service";
import { ResponseInterceptor } from "../../shared/interceptors/response.interceptor";

@Controller("reaction")
@UseInterceptors(ResponseInterceptor)
export class ReactionsController {
  constructor(private reactionsService: ReactionsService) {}
}

import { Controller, UseInterceptors } from "@nestjs/common";
import { FeedsService } from "./feeds.service";
import { ResponseInterceptor } from "../../shared/interceptors/response.interceptor";

@Controller("feed")
@UseInterceptors(ResponseInterceptor)
export class FeedsController {
  constructor(private feedsService: FeedsService) {}
}

import { Controller, UseInterceptors } from "@nestjs/common";
import { QuotesService } from "./quotes.service";
import { ResponseInterceptor } from "../../shared/interceptors/response.interceptor";

@Controller("quote")
@UseInterceptors(ResponseInterceptor)
export class QuotesController {
  constructor(private quotesService: QuotesService) {}
  // Placeholder - migrate from quote.route.ts
}

import { Controller, UseInterceptors } from "@nestjs/common";
import { SearchService } from "./search.service";
import { ResponseInterceptor } from "../../shared/interceptors/response.interceptor";

@Controller("search")
@UseInterceptors(ResponseInterceptor)
export class SearchController {
  constructor(private searchService: SearchService) {}
}

import { Controller, UseInterceptors } from "@nestjs/common";
import { CollectionsService } from "./collections.service";
import { ResponseInterceptor } from "../../shared/interceptors/response.interceptor";

@Controller("collections")
@UseInterceptors(ResponseInterceptor)
export class CollectionsController {
  constructor(private collectionsService: CollectionsService) {}
}

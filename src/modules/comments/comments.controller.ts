import { Controller, UseInterceptors } from "@nestjs/common";
import { CommentsService } from "./comments.service";
import { ResponseInterceptor } from "../../shared/interceptors/response.interceptor";

@Controller("comment")
@UseInterceptors(ResponseInterceptor)
export class CommentsController {
  constructor(private commentsService: CommentsService) {}
}

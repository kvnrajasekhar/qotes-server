import { Controller, UseInterceptors } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { ResponseInterceptor } from "../../shared/interceptors/response.interceptor";

@Controller("notification")
@UseInterceptors(ResponseInterceptor)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}
}

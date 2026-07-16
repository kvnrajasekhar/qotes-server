import { Controller, UseInterceptors } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { ResponseInterceptor } from "../../shared/interceptors/response.interceptor";

@Controller("admin")
@UseInterceptors(ResponseInterceptor)
export class AdminController {
  constructor(private adminService: AdminService) {}
}

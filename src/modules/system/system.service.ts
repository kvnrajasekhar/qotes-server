import { Injectable } from "@nestjs/common";

@Injectable()
export class SystemService {
  healthCheck() {
    return {
      success: true,
      statusCode: 200,
      message: "System is healthy",
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
      },
    };
  }
}

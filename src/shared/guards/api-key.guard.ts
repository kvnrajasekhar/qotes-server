import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKeySecret = this.configService.get("API_KEY_SECRET");

    if (!apiKeySecret) {
      throw new ForbiddenException("API_KEY_SECRET not configured on server");
    }

    const apiKey = request.headers["x-api-key"];

    if (!apiKey) {
      throw new UnauthorizedException("Missing X-API-Key header");
    }

    if (apiKey !== apiKeySecret) {
      throw new ForbiddenException("Invalid API key");
    }

    return true;
  }
}

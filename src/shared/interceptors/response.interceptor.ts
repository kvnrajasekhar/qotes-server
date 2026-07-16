import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Response<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the response is already formatted, return it as is
        if (
          data &&
          typeof data === "object" &&
          "success" in data &&
          "statusCode" in data
        ) {
          return data;
        }

        // Otherwise, format it
        return {
          success: true,
          statusCode: context.switchToHttp().getResponse().statusCode || 200,
          message: data?.message || "Success",
          data: data || {},
        };
      }),
    );
  }
}

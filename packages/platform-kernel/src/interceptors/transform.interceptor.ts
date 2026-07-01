import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Wraps all responses in the standard API envelope: { success, data, meta }.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Record<string, unknown>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Record<string, unknown>> {
    return next.handle().pipe(
      map((data) => {
        // If already an ApiResponseDto shape, pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return data as Record<string, unknown>;
        }

        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        return {
          success: statusCode < 400,
          data: data ?? null,
          meta: undefined,
        };
      }),
    );
  }
}

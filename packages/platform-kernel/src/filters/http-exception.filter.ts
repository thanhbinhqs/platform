import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Global HTTP exception filter.
 * Catches all HttpException and returns standard { success, error } format.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorBody = {
      success: false,
      error: {
        code: this.getErrorCode(status),
        message: typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as Record<string, unknown>).message,
        details: typeof exceptionResponse === 'object' ? (exceptionResponse as Record<string, string[]>).details : undefined,
      },
    };

    if (status >= 500) {
      this.logger.error(`[${status}] ${exception.message}`, exception.stack);
    }

    response.status(status).json(errorBody);
  }

  private getErrorCode(status: number): string {
    const map: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
      [HttpStatus.REQUEST_TIMEOUT]: 'TIMEOUT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
    };
    return map[status] ?? 'INTERNAL_ERROR';
  }
}

import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

interface PrismaError {
  code?: string;
  meta?: Record<string, unknown>;
  message?: string;
}

/**
 * Maps Prisma errors to standard HTTP error responses.
 */
@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: PrismaError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Only handle Prisma errors
    if (!exception?.constructor?.name?.startsWith('Prisma')) {
      throw exception; // Re-throw non-Prisma errors
    }

    const { status, code, message } = this.mapPrismaError(exception);

    this.logger.warn(`[PrismaError] ${code}: ${message}`);

    response.status(status).json({
      success: false,
      error: { code, message },
    });
  }

  private mapPrismaError(error: PrismaError): { status: number; code: string; message: string } {
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          code: 'DUPLICATE_ENTRY',
          message: `Unique constraint violation on: ${(error.meta?.target as string[])?.join(', ')}`,
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'Record not found',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'FOREIGN_KEY_ERROR',
          message: 'Referenced record does not exist',
        };
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'RELATION_CONSTRAINT',
          message: 'Relation constraint violation',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_ERROR',
          message: error.message ?? 'A database error occurred',
        };
    }
  }
}

import { Global, Module, type Provider } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

import { HttpExceptionFilter } from './filters/http-exception.filter';
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

import { EmailService } from './services/email.service';

import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

const globalProviders: Provider[] = [
  // Global filters (order: Http → Prisma → All)
  { provide: APP_FILTER, useClass: AllExceptionsFilter },
  { provide: APP_FILTER, useClass: HttpExceptionFilter },
  { provide: APP_FILTER, useClass: PrismaExceptionFilter },

  // Global interceptors
  { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
  { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },

  // Global guards
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: PermissionsGuard },
];

@Global()
@Module({
  providers: [...globalProviders, EmailService],
  exports: [EmailService],
})
export class KernelModule {}

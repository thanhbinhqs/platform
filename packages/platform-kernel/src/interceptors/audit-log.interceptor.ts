import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Interceptor that logs audit-relevant requests (mutations).
 * In production, this would push to a queue or write to audit_logs table.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, body } = request;

    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (!isMutation) {
      return next.handle();
    }

    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId: user?.id,
      action: `${method} ${url}`,
      ip,
      body: this.sanitizeBody(body),
    };

    return next.handle().pipe(
      tap(() => {
        // In production: emit to audit queue
        // this.auditService.log(auditEntry);
      }),
    );
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body) return {};
    const sensitive = ['password', 'secret', 'token', 'authorization'];
    const sanitized = { ...body };
    for (const key of sensitive) {
      if (key in sanitized) {
        sanitized[key] = '***';
      }
    }
    return sanitized;
  }
}

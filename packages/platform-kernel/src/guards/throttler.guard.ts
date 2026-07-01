import { Injectable, CanActivate, ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { THROTTLER_KEY, THROTTLER_LIMIT, THROTTLER_TTL } from '../constants/throttler.constant';

interface ThrottlerLimit {
  ttl: number;
  limit: number;
}

/**
 * Simple in-memory rate-limiter guard.
 * For production, use @nestjs/throttler with Redis store.
 */
@Injectable()
export class ThrottlerGuard implements CanActivate {
  private readonly store = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const limits = this.reflector?.getAllAndOverride<ThrottlerLimit[]>(THROTTLER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const limitSetting = limits?.[0] ?? { ttl: THROTTLER_TTL, limit: THROTTLER_LIMIT };
    const request = context.switchToHttp().getRequest();
    const key = request.ip || 'anonymous';

    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      this.store.set(key, { count: 1, resetAt: now + limitSetting.ttl });
      return true;
    }

    if (entry.count >= limitSetting.limit) {
      const response = context.switchToHttp().getResponse();
      response.status(HttpStatus.TOO_MANY_REQUESTS).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later',
        },
      });
      return false;
    }

    entry.count++;
    return true;
  }
}

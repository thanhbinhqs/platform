import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const API_KEY_HEADER = 'x-api-key';

/**
 * Guard for API key authentication (machine-to-machine).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly validApiKeys = new Set<string>();

  constructor() {
    // API keys are injected via environment or config service
    const keys = process.env.API_KEYS?.split(',') ?? [];
    for (const key of keys) {
      this.validApiKeys.add(key.trim());
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers[API_KEY_HEADER.toLowerCase()];

    if (!apiKey || !this.validApiKeys.has(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}

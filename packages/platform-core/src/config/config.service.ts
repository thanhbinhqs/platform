import { Injectable, Logger } from '@nestjs/common';
import type { Config } from './config.schema';

/**
 * Typed configuration service.
 * Wraps the raw Config object and provides typed accessors.
 */
@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(private readonly config: Config) {
    this.logger.log(`Environment: ${config.NODE_ENV}`);
  }

  get<T extends keyof Config>(key: T): Config[T] {
    return this.config[key];
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  get port(): number {
    return this.config.PORT;
  }

  get host(): string {
    return this.config.HOST;
  }

  get apiPrefix(): string {
    return `${this.config.API_PREFIX}/v${this.config.API_VERSION}`;
  }

  get corsOrigins(): string | string[] {
    const origins = this.config.CORS_ORIGINS;
    if (origins === '*') return '*';
    return origins.split(',').map((o) => o.trim());
  }

  get databaseUrl(): string {
    return this.config.DATABASE_URL;
  }

  get redisUrl(): string {
    return this.config.VALKEY_URL;
  }

  get jwtSecret(): string {
    return this.config.JWT_SECRET;
  }
}

import { z } from 'zod';

/**
 * Environment configuration schema.
 * All env vars are validated and typed at startup.
 */
export const configSchema = z.object({
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().default('api'),
  API_VERSION: z.string().default('1'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis / Valkey
  VALKEY_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // Observability
  OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default('platform-api'),
  ENABLE_METRICS: z.coerce.boolean().default(false),

  // Rate Limiting
  THROTTLE_TTL: z.coerce.number().int().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().default(100),

  // CORS
  CORS_ORIGINS: z.string().default('*'),

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3', 'minio']).default('local'),
  STORAGE_BUCKET: z.string().default('uploads'),
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
});

export type Config = z.infer<typeof configSchema>;

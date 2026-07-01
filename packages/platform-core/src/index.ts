// ═══════════════════════════════════════════════════════════════
// @platform/platform-core — Barrel Export
// ═══════════════════════════════════════════════════════════════

// ─── Prisma ─────────────────────────────────────────────────
export { PrismaModule } from './prisma/prisma.module';
export { PrismaService } from './prisma/prisma.service';

// ─── Config ─────────────────────────────────────────────────
export { ConfigModule } from './config/config.module';
export { ConfigService } from './config/config.service';
export type { Config } from './config/config.schema';
export { configSchema } from './config/config.schema';

// ─── Logger ─────────────────────────────────────────────────
export { LoggerModule } from './logger/logger.module';
export { LoggerService } from './logger/logger.service';

// ─── Health ─────────────────────────────────────────────────
export { HealthModule } from './health/health.module';

// ─── Telemetry ──────────────────────────────────────────────
export { initTelemetry } from './telemetry/telemetry.service';

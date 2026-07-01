import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
      errorFormat: 'pretty',
    });

    // Soft-delete middleware: filter deleted records globally
    this.$use(async (params, next) => {
      const softDeleteModels = [
        'Tenant', 'User', 'Role', 'WorkflowDefinition', 'Rule',
        'NotificationTemplate', 'NotificationGroup', 'AuditPolicy',
        'ScheduledJob', 'StorageBucket', 'StorageFile',
        'Integration', 'Webhook', 'FeatureFlag',
        'MetadataSchema', 'ConfigurationEntry',
      ];

      // Intercept findMany / findFirst / findUnique / count
      if (
        softDeleteModels.includes(params.model ?? '') &&
        ['findMany', 'findFirst', 'findUnique', 'count', 'findUniqueOrThrow', 'findFirstOrThrow'].includes(params.action)
      ) {
        if (!params.args) params.args = {};
        const { where, ...rest } = params.args;
        params.args = {
          ...rest,
          where: { ...where, deletedAt: null },
        };
      }

      // Intercept update → set updatedAt
      if (
        softDeleteModels.includes(params.model ?? '') &&
        params.action === 'update'
      ) {
        if (!params.args) params.args = {};
        params.args.data = { ...params.args.data, updatedAt: new Date() };
      }

      return next(params);
    });

    // Log slow queries in development
    this.$on('query' as any, (e: any) => {
      if (e.duration > 1000) {
        this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  /**
   * Clean up soft-deleted records older than retention days
   */
  async purgeSoftDeleted(retentionDays = 90): Promise<Record<string, number>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const results: Record<string, number> = {};
    const models = ['Tenant', 'User', 'Role', 'WorkflowDefinition', 'ScheduledJob', 'StorageFile', 'ConfigurationEntry'];

    for (const model of models) {
      // @ts-expect-error dynamic access
      const count = await this[model.toLowerCase()].deleteMany({
        where: {
          deletedAt: { not: null, lte: cutoff },
        },
      });
      results[model] = count;
    }

    return results;
  }
}

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public readonly client: PrismaClient;

  constructor() {
    this.client = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
      errorFormat: 'pretty',
    }) as PrismaClient;

    // Log slow queries in development
    (this.client as any).$on('query', (e: any) => {
      if (e.duration > 1000) {
        this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }

  /**
   * Get the underlying Prisma client.
   * For most operations, use `this.prisma.<model>` directly.
   * Access via constructor injection: `private readonly prisma: PrismaService`
   */
  get prisma(): PrismaClient {
    return this.client;
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
    this.logger.log('Connected to database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
    this.logger.log('Disconnected from database');
  }

  /**
   * Clean up soft-deleted records older than retention days.
   */
  async purgeSoftDeleted(retentionDays = 90): Promise<Record<string, number>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const results: Record<string, number> = {};
    const models = [
      'Tenant', 'User', 'Role', 'WorkflowDefinition',
      'ScheduledJob', 'StorageFile', 'ConfigurationEntry',
    ];

    for (const model of models) {
      // @ts-expect-error dynamic access
      const { count } = await this.client[model.toLowerCase()].deleteMany({
        where: {
          deletedAt: { not: null, lte: cutoff },
        },
      });
      results[model] = count;
    }

    return results;
  }
}

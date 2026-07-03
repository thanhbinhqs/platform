import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@platform/platform-core';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    action: string;
    resource: string;
    resourceId?: string;
    userId?: string;
    tenantId?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    status?: 'SUCCESS' | 'FAILURE' | 'DENIED' | 'ERROR';
    severity?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    duration?: number;
  }) {
    try {
      await this.prisma.client.auditLog.create({ data: params as any });
    } catch (err) {
      this.logger.error(`Failed to write audit log: ${err}`);
    }
  }

  async findAll(options: { page?: number; limit?: number; userId?: string; action?: string }): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 50, 200);

    const where: any = {};
    if (options.userId) where.userId = options.userId;
    if (options.action) where.action = options.action;

    const [data, total] = await Promise.all([
      this.prisma.client.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, username: true, displayName: true } } },
      }),
      this.prisma.client.auditLog.count({ where }),
    ]);

    return { data: data as any[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

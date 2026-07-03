import { Injectable } from '@nestjs/common';
import { PrismaService } from '@platform/platform-core';

@Injectable()
export class SecurityEventService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: { userId: string; type: string; ipAddress?: string; metadata?: Record<string, unknown> }) {
    await this.prisma.client.securityEvent.create({ data: params as any });
  }

  async findByUser(userId: string, limit = 20, page = 1): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const take = Math.min(limit, 100);
    const [items, total] = await Promise.all([
      this.prisma.client.securityEvent.findMany({
        where: { userId }, orderBy: { createdAt: 'desc' }, take, skip: (page - 1) * take,
      }),
      this.prisma.client.securityEvent.count({ where: { userId } }),
    ]);
    return { data: items as any[], total, page, limit: take, totalPages: Math.ceil(total / take) };
  }
}
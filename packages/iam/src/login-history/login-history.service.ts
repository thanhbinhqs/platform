import { Injectable } from '@nestjs/common';
import { PrismaService } from '@platform/platform-core';

@Injectable()
export class LoginHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId: string;
    status: string;
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: string;
    failureReason?: string;
  }) {
    await this.prisma.client.loginHistory.create({ data: params as any });
  }

  async findByUser(userId: string, limit = 20, page = 1): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const take = Math.min(limit, 100);
    const where = { userId };
    const [items, total] = await Promise.all([
      this.prisma.client.loginHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip: (page - 1) * take,
      }),
      this.prisma.client.loginHistory.count({ where }),
    ]);
    return { data: items as any[], total, page, limit: take, totalPages: Math.ceil(total / take) };
  }
}

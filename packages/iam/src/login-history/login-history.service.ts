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

  async findByUser(userId: string, limit = 20, page = 1, search?: string, sortField?: string, sortDir?: string): Promise<{ data: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const pageSize = Math.min(limit, 100);
    const currentPage = Math.max(1, page);
    const where: any = { userId };
    if (search) {
      where.OR = [
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { userAgent: { contains: search, mode: 'insensitive' } },
        { deviceInfo: { contains: search, mode: 'insensitive' } },
        { failureReason: { contains: search, mode: 'insensitive' } },
      ];
    }
    const orderBy = sortField ? { [sortField]: sortDir || 'asc' } : { createdAt: 'desc' as const };
    const [items, total] = await Promise.all([
      this.prisma.client.loginHistory.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (currentPage - 1) * pageSize,
      }),
      this.prisma.client.loginHistory.count({ where }),
    ]);
    return { data: items as any[], total, page: currentPage, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}

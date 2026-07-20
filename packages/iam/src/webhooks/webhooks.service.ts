import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@platform/platform-core';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params?: { page?: number; limit?: number; search?: string; sortField?: string; sortDir?: string }): Promise<any> {
    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.min(100, Math.max(1, params?.limit || 20));
    const skip = (page - 1) * pageSize;
    const orderBy = params?.sortField ? { [params.sortField]: params.sortDir || 'asc' } : { createdAt: 'desc' as const };
    const where: any = {};
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { url: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.client.webhook.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: { _count: { select: { deliveries: true } } },
      } as any),
      this.prisma.client.webhook.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}

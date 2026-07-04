// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// Pagination Helper — Standard GridResponse for DataGrid
// ═══════════════════════════════════════════════════════════════

import { PrismaService } from '@platform/platform-core';

export interface GridResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FindAllParams {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
  include?: any;
  where?: any;
}

export class PaginationHelper {
  constructor(private prisma: PrismaService) {}

  async findMany<T>(
    model: string,
    params: FindAllParams,
    customWhere?: any,
  ): Promise<GridResponse<T>> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * pageSize;
    const orderBy = params.sortField
      ? { [params.sortField]: params.sortDir || 'asc' }
      : { createdAt: 'desc' as const };

    // Build where clause
    const where: any = { ...customWhere };
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'string' && value.startsWith('%')) {
            where[key] = { contains: value.slice(1), mode: 'insensitive' };
          } else {
            where[key] = value;
          }
        }
      });
    }

    const [data, total] = await Promise.all([
      (this.prisma.client as any)[model].findMany({ where, skip, take: pageSize, orderBy, include: params.include }),
      (this.prisma.client as any)[model].count({ where }),
    ]);

    return { data: data as T[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}

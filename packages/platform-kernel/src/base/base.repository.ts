import type { IRepository, FindManyOptions, CursorPaginationOptions, CursorPaginatedResult } from '../interfaces/repository.interface';
import type { BaseEntity } from '../base/base.entity';

/**
 * Abstract base repository providing default implementations.
 * Concrete repositories extend this and provide the Prisma delegate.
 */
export abstract class BaseRepository<T extends BaseEntity> implements IRepository<T> {
  protected abstract get delegate(): {
    findUnique: (args: { where: { id: string } }) => Promise<T | null>;
    findFirst: (args: { where: Record<string, unknown> }) => Promise<T | null>;
    findMany: (args: Record<string, unknown>) => Promise<T[]>;
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
    create: (args: { data: Record<string, unknown> }) => Promise<T>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<T>;
    delete: (args: { where: { id: string } }) => Promise<T>;
  };

  async findById(id: string): Promise<T | null> {
    return this.delegate.findUnique({ where: { id } });
  }

  async findOne(where: Partial<T>): Promise<T | null> {
    return this.delegate.findFirst({ where: where as Record<string, unknown> });
  }

  async findMany(where?: Partial<T>, options?: FindManyOptions<T>): Promise<T[]> {
    return this.delegate.findMany({
      where: (where ?? {}) as Record<string, unknown>,
      orderBy: options?.orderBy,
      skip: options?.skip,
      take: options?.take,
    });
  }

  async count(where?: Partial<T>): Promise<number> {
    return this.delegate.count({ where: (where ?? {}) as Record<string, unknown> });
  }

  async create(data: Record<string, unknown>): Promise<T> {
    return this.delegate.create({ data });
  }

  async update(id: string, data: Record<string, unknown>): Promise<T> {
    return this.delegate.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDelete(id: string, deletedBy?: string): Promise<T> {
    return this.delegate.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy } as Record<string, unknown>,
    });
  }

  async hardDelete(id: string): Promise<T> {
    return this.delegate.delete({ where: { id } });
  }

  async exists(where: Partial<T>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  async findCursorPaginated(options: CursorPaginationOptions<T>): Promise<CursorPaginatedResult<T>> {
    const take = options.take ?? 20;
    const items = await this.delegate.findMany({
      where: (options.where ?? {}) as Record<string, unknown>,
      orderBy: options.orderBy ?? { id: 'asc' as const },
      take: take + 1, // Fetch one extra to check hasMore
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > take;
    if (hasMore) items.pop();

    return {
      data: items,
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      hasMore,
    };
  }
}

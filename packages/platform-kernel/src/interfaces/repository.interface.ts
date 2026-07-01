import type { BaseEntity } from '../base/base.entity';

/**
 * Generic repository interface for all domain entities.
 * Follows the Repository Pattern from Domain-Driven Design.
 */
export interface IRepository<T extends BaseEntity> {
  /** Find by primary key */
  findById(id: string): Promise<T | null>;

  /** Find first matching criteria */
  findOne(where: Partial<T>): Promise<T | null>;

  /** Find many matching criteria */
  findMany(where?: Partial<T>, options?: FindManyOptions<T>): Promise<T[]>;

  /** Count matching criteria */
  count(where?: Partial<T>): Promise<number>;

  /** Create entity */
  create(data: CreateData<T>): Promise<T>;

  /** Update entity by id */
  update(id: string, data: UpdateData<T>): Promise<T>;

  /** Soft delete (set deletedAt) */
  softDelete(id: string, deletedBy?: string): Promise<T>;

  /** Hard delete (remove from DB) */
  hardDelete(id: string): Promise<T>;

  /** Check if entity exists */
  exists(where: Partial<T>): Promise<boolean>;

  /** Paginated cursor-based query */
  findCursorPaginated(options: CursorPaginationOptions<T>): Promise<CursorPaginatedResult<T>>;
}

export interface FindManyOptions<T> {
  orderBy?: Record<keyof T, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
}

export type CreateData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deletedBy'>;
export type UpdateData<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

export interface CursorPaginationOptions<T> {
  take?: number;
  cursor?: string;
  where?: Partial<T>;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

import type { NotFoundException, ConflictException } from '@nestjs/common';
import type { BaseEntity } from '../base/base.entity';

/**
 * Generic CRUD service interface.
 * All domain services extend this.
 */
export interface IBaseService<T extends BaseEntity> {
  findById(id: string): Promise<T>;
  findMany(where?: Partial<T>): Promise<T[]>;
  create(data: Record<string, unknown>): Promise<T>;
  update(id: string, data: Record<string, unknown>): Promise<T>;
  delete(id: string): Promise<T>;
  restore(id: string): Promise<T>;
}

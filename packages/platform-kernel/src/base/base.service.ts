import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import type { IRepository } from '../interfaces/repository.interface';
import type { IBaseService } from '../interfaces/base-service.interface';
import type { BaseEntity } from '../base/base.entity';

/**
 * Generic base service with full CRUD implementation.
 * Concrete services extend this for domain-specific logic.
 */
@Injectable()
export abstract class BaseService<T extends BaseEntity> implements IBaseService<T> {
  protected readonly logger: Logger;

  constructor(protected readonly repository: IRepository<T>, serviceName: string) {
    this.logger = new Logger(serviceName);
  }

  async findById(id: string): Promise<T> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(`Entity with id ${id} not found`);
    }
    return entity;
  }

  async findMany(where?: Partial<T>): Promise<T[]> {
    return this.repository.findMany(where);
  }

  async create(data: Record<string, unknown>): Promise<T> {
    return this.repository.create(data as any);
  }

  async update(id: string, data: Record<string, unknown>): Promise<T> {
    await this.findById(id);
    return this.repository.update(id, data as any);
  }

  async delete(id: string): Promise<T> {
    await this.findById(id);
    return this.repository.softDelete(id);
  }

  async restore(id: string): Promise<T> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(`Entity with id ${id} not found`);
    }
    return this.repository.update(id, { deletedAt: null, deletedBy: null } as any);
  }

  async exists(where: Partial<T>): Promise<boolean> {
    return this.repository.exists(where);
  }

  async count(where?: Partial<T>): Promise<number> {
    return this.repository.count(where);
  }
}

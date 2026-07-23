import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@platform/platform-core';
import { SALT_ROUNDS } from '../common/constants/iam.constants';
import type { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Default user select excluding sensitive fields */
  private readonly userSelect = {
    id: true,
    username: true,
    email: true,
    displayName: true,
    status: true,
    tenantId: true,
    createdAt: true,
    updatedAt: true,
    roles: {
      select: {
        role: {
          select: { id: true, name: true },
        },
      },
    },
    permissions: {
      select: {
        permission: { select: { id: true, action: true, resource: true } },
        effect: true,
      },
    },
  } as const;

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.client.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.client.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        displayName: dto.displayName ?? dto.username,
        status: 'ACTIVE',
        tenantId: dto.tenantId ?? null,
        roles: dto.roleIds
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      select: this.userSelect,
    });

    this.logger.log(`Created user: ${user.email}`);

    return this.formatUser(user);
  }

  async findAll(params?: { page?: number; limit?: number; search?: string; sortField?: string; sortDir?: string; filters?: Record<string, string> }) {
    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.min(100, Math.max(1, params?.limit || 20));
    const skip = (page - 1) * pageSize;
    const orderBy = params?.sortField ? { [params.sortField]: params.sortDir || 'asc' } : { createdAt: 'desc' as const };
    const where: any = { deletedAt: null };
    if (params?.search) {
      where.OR = [
        { username: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { displayName: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    // Process individual field filters (filter[field]=value)
    if (params?.filters) {
      for (const [field, value] of Object.entries(params.filters)) {
        if (!value || value === '') continue;
        if (field === 'username' || field === 'email' || field === 'displayName' || field === 'phone') {
          where[field] = { contains: value, mode: 'insensitive' };
        } else if (field === 'isActive') {
          if (value === 'true' || value === 'on') where.status = 'ACTIVE';
          else if (value === 'false' || value === 'off') where.status = { not: 'ACTIVE' };
        } else if (field === 'status') {
          where.status = value;
        } else if (field === 'roleId') {
          where.roles = { some: { roleId: value } };
        } else if (field === 'createdAt') {
          const parts = value.split(',');
          if (parts[0]) where.createdAt = { ...where.createdAt, gte: new Date(parts[0]) };
          if (parts[1]) where.createdAt = { ...where.createdAt, lte: new Date(parts[1] + 'T23:59:59.999Z') };
        }
      }
    }
    const [data, total] = await Promise.all([
      this.prisma.client.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: this.userSelect,
      }),
      this.prisma.client.user.count({ where }),
    ]);
    return { data: data.map((u) => this.formatUser(u)), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findById(id: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id, deletedAt: null },
      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.client.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.displayName) updateData.displayName = dto.displayName;
    if (dto.isActive !== undefined) {
      updateData.status = dto.isActive ? 'ACTIVE' : 'INACTIVE';
    }
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }
    if (dto.tenantId !== undefined) {
      updateData.tenantId = dto.tenantId ?? null;
    }
    if (dto.roleIds) {
      // Replace all roles
      await this.prisma.client.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.client.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }

    if (dto.directPermissions) {
      // Replace all direct user permissions
      await this.prisma.client.userPermission.deleteMany({ where: { userId: id } });
      if (dto.directPermissions.length > 0) {
        await this.prisma.client.userPermission.createMany({
          data: dto.directPermissions.map((dp) => ({
            userId: id,
            permissionId: dp.permissionId,
            effect: dp.effect,
          })),
        });
      }
    }

    const updated = await this.prisma.client.user.update({
      where: { id },
      data: updateData as any,
      select: this.userSelect,
    });

    return this.formatUser(updated);
  }

  async remove(id: string) {
    const user = await this.prisma.client.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete
    await this.prisma.client.user.update({
      where: { id },
      data: { deletedAt: new Date() } as any,
    });

    return { deleted: true, id };
  }

  async bulkRemove(ids: string[]) {
    const users = await this.prisma.client.user.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    if (!users.length) return { deleted: 0 };
    await this.prisma.client.user.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() } as any,
    });
    return { deleted: ids.length };
  }

  async bulkActivate(ids: string[]) {
    await this.prisma.client.user.updateMany({
      where: { id: { in: ids } },
      data: { status: 'ACTIVE' } as any,
    });
    return { updated: ids.length };
  }

  async bulkDeactivate(ids: string[]) {
    await this.prisma.client.user.updateMany({
      where: { id: { in: ids } },
      data: { status: 'INACTIVE' } as any,
    });
    return { updated: ids.length };
  }

  /** Normalise pivot structure into flat roles array */
  private formatUser(user: Record<string, any>) {
    return {
      ...user,
      roles: (user.roles ?? []).map((ur: any) => ({
        id: ur.role.id,
        name: ur.role.name,
      })),
      permissions: (user.permissions ?? []).map((up: any) => ({
        id: up.permission.id,
        action: up.permission.action,
        resource: up.permission.resource,
        effect: up.effect,
        name: `${up.permission.action}:${up.permission.resource}`,
      })),
    };
  }

  async search(q?: string, limit: number = 10) {
    const where: any = { deletedAt: null };
    if (q) {
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ];
    }
    const data = await this.prisma.client.user.findMany({
      where,
      take: Math.min(limit, 50),
      orderBy: [{ isOnline: 'desc' } as any, { username: 'asc' }],
      select: { id: true, username: true, email: true, displayName: true },
    });
    return { data: data.map(u => ({ ...u, label: u.displayName || u.username })) };
  }
}

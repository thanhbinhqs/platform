// @ts-nocheck
import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@platform/platform-core';
import type { CreateRoleDto, AssignPermissionsDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(params?: { page?: number; limit?: number; search?: string; sortField?: string; sortDir?: string }): Promise<any> {
    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.min(100, Math.max(1, params?.limit || 20));
    const skip = (page - 1) * pageSize;
    const orderBy = params?.sortField ? { [params.sortField]: params.sortDir || 'asc' } : { createdAt: 'desc' as const };
    const where: any = { deletedAt: null };
    if (params?.search) {
      where.OR = [{ name: { contains: params.search, mode: 'insensitive' } }, { description: { contains: params.search, mode: 'insensitive' } }];
    }
    const [data, total] = await Promise.all([
      this.prisma.client.role.findMany({ where, skip, take: pageSize, orderBy, include: { permissions: { include: { permission: true } } } }),
      this.prisma.client.role.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.client.role.findFirst({
      where: { name: dto.name, deletedAt: null } as any,
    });
    if (existing) {
      throw new ConflictException('Role with this name already exists');
    }

    const role = await this.prisma.client.role.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
      },
      include: { permissions: { include: { permission: true } } },
    });

    this.logger.log(`Created role: ${role.name}`);
    return this.findById(role.id);
  }

  async findById(id: string) {
    const role = await this.prisma.client.role.findUnique({
      where: { id, deletedAt: null },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return this.formatRole(role);
  }

  async update(id: string, dto: Partial<CreateRoleDto>) {
    const role = await this.prisma.client.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    const data: Record<string, unknown> = {};
    if (dto.name) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;

    const updated = await this.prisma.client.role.update({
      where: { id },
      data: data as any,
      include: { permissions: { include: { permission: true } } },
    });
    return this.formatRole(updated);
  }

  async remove(id: string) {
    const role = await this.prisma.client.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    // Soft delete
    await this.prisma.client.role.update({
      where: { id },
      data: { deletedAt: new Date() } as any,
    });
    return { deleted: true, id };
  }

  async assignPermissions(roleId: string, dto: AssignPermissionsDto) {
    const role = await this.prisma.client.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    // Replace all permissions
    await this.prisma.client.rolePermission.deleteMany({ where: { roleId } });
    if (dto.permissionIds.length > 0) {
      await this.prisma.client.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({ roleId, permissionId })),
      });
    }

    return this.findById(roleId);
  }

  private formatRole(role: Record<string, any>) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      type: role.type,
      isSystem: role.type === 'SYSTEM',
      permissions: (role.permissions ?? []).map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        resource: rp.permission.resource,
        action: rp.permission.action,
      })),
    };
  }
}

import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Permissions } from '@platform/platform-kernel';
import { PrismaService } from '@platform/platform-core';
import type { AuthenticatedUser } from '../common';

@ApiTags('Delegations')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('delegations')
export class DelegationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List delegations (given + received)' })
  async findAll(@CurrentUser() u: AuthenticatedUser, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string, @Query('sortField') sortField?: string, @Query('sortDir') sortDir?: string): Promise<any> {
    const [given, received] = await Promise.all([
      this.prisma.client.delegation.findMany({
        where: { delegatorId: u.id },
        include: { delegate: { select: { id: true, username: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
      } as any),
      this.prisma.client.delegation.findMany({
        where: { delegateId: u.id },
        include: { delegator: { select: { id: true, username: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
      } as any),
    ]);
    return { given, received };
  }

  @Post()
  @Permissions('manage:users')
  @ApiOperation({ summary: 'Create delegation' })
  async create(@CurrentUser() u: AuthenticatedUser, @Body() body: { delegateId: string; roleId: string; permissions?: string[]; expiresAt?: string }): Promise<any> {
    return this.prisma.client.delegation.create({
      data: {
        delegatorId: u.id,
        delegateId: body.delegateId,
        roleId: body.roleId,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    } as any);
  }

  @Put(':id')
  @Permissions('manage:users')
  @ApiOperation({ summary: 'Update delegation' })
  async update(@Param('id') id: string, @Body() body: any): Promise<any> {
    return this.prisma.client.delegation.update({ where: { id }, data: body } as any);
  }

  @Delete(':id')
  @Permissions('manage:users')
  @ApiOperation({ summary: 'Revoke delegation' })
  async remove(@Param('id') id: string): Promise<any> {
    return this.prisma.client.delegation.update({ where: { id }, data: { status: 'REVOKED' } } as any);
  }
}

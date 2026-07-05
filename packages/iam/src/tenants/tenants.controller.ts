import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '@platform/platform-core';
import { Permissions } from '@platform/platform-kernel';

@ApiTags('Tenants')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('tenants')
export class TenantsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions('manage:tenants')
  @ApiOperation({ summary: 'List all tenants' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string, @Query('sortField') sortField?: string, @Query('sortDir') sortDir?: string): Promise<any> {
    const pg = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(limit) || 20));
    const sk = (pg - 1) * ps;
    const wh: any = {};
    if (search) wh.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }];
    const ob: any = sortField ? { [sortField]: (sortDir || 'asc') as any } : { createdAt: 'desc' };
    const [data, total] = await Promise.all([
      this.prisma.client.tenant.findMany({ where: wh, skip: sk, take: ps, orderBy: ob }),
      this.prisma.client.tenant.count({ where: wh }),
    ]);
    return { data, total, page: pg, pageSize: ps, totalPages: Math.ceil(total / ps) };
  }

  @Get(':id')
  @Permissions('manage:tenants')
  @ApiOperation({ summary: 'Get tenant by ID' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.prisma.client.tenant.findUnique({ where: { id } });
  }

  @Post()
  @Permissions('manage:tenants')
  @ApiOperation({ summary: 'Create tenant' })
  async create(@Body() data: any): Promise<any> {
    return this.prisma.client.tenant.create({ data: { ...data, name: data.name || 'New Tenant' } });
  }

  @Put(':id')
  @Permissions('manage:tenants')
  @ApiOperation({ summary: 'Update tenant' })
  async update(@Param('id') id: string, @Body() data: any): Promise<any> {
    return this.prisma.client.tenant.update({ where: { id }, data });
  }

  @Delete(':id')
  @Permissions('manage:tenants')
  @ApiOperation({ summary: 'Suspend tenant' })
  async remove(@Param('id') id: string): Promise<any> {
    return this.prisma.client.tenant.update({ where: { id }, data: { status: 'SUSPENDED' } });
  }
}
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
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
  async findAll(): Promise<any> {
    return this.prisma.client.tenant.findMany({ orderBy: { createdAt: 'desc' } });
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
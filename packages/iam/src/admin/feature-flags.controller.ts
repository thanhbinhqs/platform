import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '@platform/platform-core';
import { Permissions } from '@platform/platform-kernel';

@ApiTags('Feature Flags')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all feature flags' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string, @Query('sortField') sortField?: string, @Query('sortDir') sortDir?: string): Promise<any> {
    const pg = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(limit) || 20));
    const sk = (pg - 1) * ps;
    const wh: any = {};
    if (search) wh.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }];
    const ob: any = sortField ? { [sortField]: sortDir || 'asc' } : { createdAt: 'desc' };
    const [data, total] = await Promise.all([
      this.prisma.client.featureFlag.findMany({ where: wh, skip: sk, take: ps, orderBy: ob }),
      this.prisma.client.featureFlag.count({ where: wh }),
    ]);
    return { data, total, page: pg, pageSize: ps, totalPages: Math.ceil(total / ps) };
  }

  @Post()
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Create feature flag' })
  async create(@Body() data: any): Promise<any> {
    return this.prisma.client.featureFlag.create({ data });
  }

  @Put(':id')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Toggle feature flag' })
  async update(@Param('id') id: string, @Body() data: any): Promise<any> {
    return this.prisma.client.featureFlag.update({ where: { id }, data });
  }
}
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
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
  async findAll(): Promise<any> {
    return this.prisma.client.featureFlag.findMany({ orderBy: { createdAt: 'desc' } });
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
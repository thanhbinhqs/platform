import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '@platform/platform-kernel';
import { PrismaService } from '@platform/platform-core';
@ApiTags('Rules')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('rules')
export class RulesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @ApiOperation({ summary: 'List rules' })
  async findAll(): Promise<any> { return this.prisma.client.rule.findMany({ include: { _count: { select: { executions: true } } }, orderBy: { createdAt: 'desc' } } as any); }
  @Post() @Permissions('manage:settings')
  @ApiOperation({ summary: 'Create rule' })
  async create(@Body() b: any): Promise<any> {
    return this.prisma.client.rule.create({ data: { name: b.name, description: b.description, status: b.status || 'ACTIVE', event: b.event || 'user.created', conditions: b.conditions || {}, actions: b.actions || [] } } as any);
  }
  @Put(':id') @Permissions('manage:settings')
  @ApiOperation({ summary: 'Update rule' })
  async update(@Param('id') id: string, @Body() b: any): Promise<any> { return this.prisma.client.rule.update({ where: { id }, data: b } as any); }
  @Delete(':id') @Permissions('manage:settings')
  @ApiOperation({ summary: 'Disable rule' })
  async remove(@Param('id') id: string): Promise<any> { return this.prisma.client.rule.update({ where: { id }, data: { status: 'ARCHIVED' } } as any); }
}
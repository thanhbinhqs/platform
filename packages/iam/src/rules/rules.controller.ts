import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
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
  @Get() @Permissions('read:rules')
  @ApiOperation({ summary: 'List rules' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string, @Query('sortField') sortField?: string, @Query('sortDir') sortDir?: string): Promise<any> {
    const pg = Math.max(1, Number(page) || 1); const ps = Math.min(100, Math.max(1, Number(limit) || 20)); const sk = (pg - 1) * ps; const wh: any = {}; if (search) wh.OR = [{ name: { contains: search, mode: 'insensitive' } }]; const ob: any = sortField ? { [sortField]: (sortDir || 'asc') as any } : { createdAt: 'desc' }; const [data, total] = await Promise.all([this.prisma.client.rule.findMany({ where: wh, skip: sk, take: ps, orderBy: ob, include: { _count: { select: { executions: true } } } }), this.prisma.client.rule.count({ where: wh })]); return { data, total, page: pg, pageSize: ps, totalPages: Math.ceil(total / ps) };
  }
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
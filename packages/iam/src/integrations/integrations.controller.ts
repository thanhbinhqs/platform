import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '@platform/platform-kernel';
import { PrismaService } from '@platform/platform-core';
@ApiTags('Integrations')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  @Permissions('read:integrations')
  @ApiOperation({ summary: 'List integrations' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string, @Query('sortField') sortField?: string, @Query('sortDir') sortDir?: string): Promise<any> { const pg = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(limit) || 20));
    const sk = (pg - 1) * ps;
    const wh: any = {};
    if (search) wh.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }];
    const ob: any = sortField ? { [sortField]: (sortDir || 'asc') as any } : { createdAt: 'desc' };
    const [data, total] = await Promise.all([
      this.prisma.client.integration.findMany({ where: wh, skip: sk, take: ps, orderBy: ob }),
      this.prisma.client.integration.count({ where: wh }),
    ]);
    return { data, total, page: pg, pageSize: ps, totalPages: Math.ceil(total / ps) };
  }
  @Post() @Permissions('manage:settings')
  @ApiOperation({ summary: 'Create integration' })
  async create(@Body() b: any): Promise<any> { return (this.prisma.client.integration.create({ data: { name: b.name, type: b.type, provider: b.provider || 'MANUAL', config: b.config || {}, status: 'DISCONNECTED' } as any }) as any); }
  @Put(':id') @Permissions('manage:settings')
  @ApiOperation({ summary: 'Update integration' })
  async update(@Param('id') id: string, @Body() b: any): Promise<any> { return this.prisma.client.integration.update({ where: { id }, data: b }); }
  @Delete(':id') @Permissions('manage:settings')
  @ApiOperation({ summary: 'Delete integration' })
  async remove(@Param('id') id: string): Promise<any> { return this.prisma.client.integration.update({ where: { id }, data: { status: 'DISCONNECTED' as any } }); }
}
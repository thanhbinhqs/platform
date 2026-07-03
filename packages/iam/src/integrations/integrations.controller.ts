import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
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
  @Get() @ApiOperation({ summary: 'List integrations' })
  async findAll(): Promise<any> { return this.prisma.client.integration.findMany({ orderBy: { createdAt: 'desc' } }); }
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
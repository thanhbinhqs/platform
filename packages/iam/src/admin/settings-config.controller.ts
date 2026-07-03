import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '@platform/platform-core';
import { Permissions } from '@platform/platform-kernel';

@ApiTags('System Settings')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('settings-config')
export class SettingsConfigController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions('read:settings')
  @ApiOperation({ summary: 'Get all configuration entries' })
  async findAll(): Promise<any> {
    return this.prisma.client.configurationEntry.findMany({ orderBy: { key: 'asc' } } as any);
  }

  @Put()
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Upsert a configuration entry' })
  async upsert(@Body() body: { key: string; value: string; type?: string; scope?: string }): Promise<any> {
    const existing = await this.prisma.client.configurationEntry.findFirst({ where: { key: body.key } } as any);
    if (existing) {
      return this.prisma.client.configurationEntry.update({ where: { id: existing.id }, data: { value: body.value } } as any);
    }
    return this.prisma.client.configurationEntry.create({
      data: { key: body.key, value: body.value, type: body.type || 'STRING', scope: body.scope || 'GLOBAL' },
    } as any);
  }
}
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '@platform/platform-kernel';
import { PrismaService } from '@platform/platform-core';
import { BulkIdsDto } from '../common/dto/bulk-ids.dto';

@ApiTags('Webhooks')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions('read:webhooks')
  @ApiOperation({ summary: 'List webhooks' })
  async findAll(): Promise<any> {
    return this.prisma.client.webhook.findMany({
      include: { _count: { select: { deliveries: true } } },
      orderBy: { createdAt: 'desc' },
    } as any);
  }

  @Post()
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Create webhook' })
  async create(@Body() b: any): Promise<any> {
    return this.prisma.client.webhook.create({
      data: {
        name: b.name,
        url: b.url,
        events: b.events || [],
        secret: b.secret,
        isActive: b.isActive ?? b.enabled ?? true,
      },
    } as any);
  }

  @Put(':id')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Update webhook' })
  async update(@Param('id') id: string, @Body() b: any): Promise<any> {
    return this.prisma.client.webhook.update({ where: { id }, data: b } as any);
  }

  @Delete(':id')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Delete webhook' })
  async remove(@Param('id') id: string): Promise<any> {
    return this.prisma.client.webhook.delete({ where: { id } } as any);
  }

  @Post('bulk/delete')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Bulk delete webhooks' })
  async bulkRemove(@Body() dto: BulkIdsDto): Promise<any> {
    return this.prisma.client.webhook.deleteMany({ where: { id: { in: dto.ids } } } as any);
  }

  @Get('deliveries')
  @Permissions('read:webhooks')
  @ApiOperation({ summary: 'List webhook deliveries' })
  async deliveries(@Query('webhookId') webhookId?: string): Promise<any> {
    const where = webhookId ? { webhookId } : {};
    return this.prisma.client.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    } as any);
  }
}

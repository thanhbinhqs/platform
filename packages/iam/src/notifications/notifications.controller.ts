import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions, CurrentUser } from '@platform/platform-kernel';
import { PrismaService } from '@platform/platform-core';
import type { AuthenticatedUser } from '../common';
@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @ApiOperation({ summary: 'List my notifications' })
  async findAll(@CurrentUser() u: AuthenticatedUser, @Query('limit') l?: number): Promise<any> {
    return this.prisma.client.notification.findMany({
      where: { recipientId: u.id }, orderBy: { createdAt: 'desc' }, take: Math.min(l ?? 20, 100),
    });
  }
  @Post('read/:id') @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string): Promise<any> {
    return this.prisma.client.notification.updateMany({ where: { id, recipientId: u.id }, data: { readAt: new Date() } });
  }
  @Get('templates') @Permissions('manage:settings')
  @ApiOperation({ summary: 'List notification templates' })
  async templates(): Promise<any> { return this.prisma.client.notificationTemplate.findMany({ orderBy: { createdAt: 'desc' } }); }
  @Post('templates') @Permissions('manage:settings')
  @ApiOperation({ summary: 'Create template' })
  async createTemplate(@Body() b: any): Promise<any> {
    return this.prisma.client.notificationTemplate.create({ data: { name: b.name, type: b.type || 'EMAIL', channel: b.channel || 'IN_APP', subject: b.subject, body: b.body, variables: b.variables || [] } } as any);
  }
  @Get('preferences') @ApiOperation({ summary: 'Get notification preferences' })
  async getPrefs(@CurrentUser() u: AuthenticatedUser): Promise<any> {
    return this.prisma.client.notificationPreference.findMany({ where: { userId: u.id } });
  }
  @Put('preferences') @ApiOperation({ summary: 'Update notification preferences' })
  async upsertPrefs(@CurrentUser() u: AuthenticatedUser, @Body() prefs: any[]): Promise<any> {
    for (const p of prefs) {
      await this.prisma.client.notificationPreference.upsert({
        where: { userId_channel: { userId: u.id, channel: p.channel } },
        update: { isEnabled: p.isEnabled ?? p.enabled },
        create: { userId: u.id, channel: p.channel, isEnabled: p.isEnabled ?? p.enabled },
      } as any);
    }
    return { success: true };
  }
}
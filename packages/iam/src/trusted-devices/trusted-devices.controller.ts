import { Controller, Get, Post, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@platform/platform-kernel';
import { PrismaService } from '@platform/platform-core';
import type { AuthenticatedUser } from '../common';

@ApiTags('Trusted Devices')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('trusted-devices')
export class TrustedDevicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List trusted devices' })
  async findAll(@CurrentUser() u: AuthenticatedUser, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string, @Query('sortField') sortField?: string, @Query('sortDir') sortDir?: string): Promise<any> {
    return this.prisma.client.trustedDevice.findMany({ where: { userId: u.id }, orderBy: { lastUsedAt: 'desc' } });
  }

  @Post()
  @ApiOperation({ summary: 'Add trusted device' })
  async create(@CurrentUser() u: AuthenticatedUser, @Body() body: { deviceId: string; deviceName?: string }): Promise<any> {
    return this.prisma.client.trustedDevice.upsert({
      where: { userId_deviceId: { userId: u.id, deviceId: body.deviceId } },
      update: { deviceName: body.deviceName, lastUsedAt: new Date() },
      create: { userId: u.id, deviceId: body.deviceId, deviceName: body.deviceName },
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove trusted device' })
  async remove(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string): Promise<any> {
    return this.prisma.client.trustedDevice.deleteMany({ where: { id, userId: u.id } });
  }
}
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '@platform/platform-core';

@ApiTags('Permissions')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all available permissions' })
  async findAll() {
    const permissions = await this.prisma.client.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
    return permissions.map((p) => ({
      id: p.id,
      name: p.action + ':' + p.resource,
      action: p.action,
      resource: p.resource,
      description: p.description,
    }));
  }
}

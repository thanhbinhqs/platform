import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '@platform/platform-kernel';
import { RolesService } from './roles.service';
import type { CreateRoleDto, AssignPermissionsDto } from './dto/role.dto';
import { BulkIdsDto } from '../common/dto/bulk-ids.dto';

@ApiTags('Roles')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions('manage:roles')
  @ApiOperation({ summary: 'Create a new role' })
  async create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @Permissions('manage:roles')
  @ApiOperation({ summary: 'List all roles' })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string, @Query('sortField') sortField?: string, @Query('sortDir') sortDir?: string) {
   return this.rolesService.findAll({ page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined, search, sortField, sortDir });
 }

  @Get('search')
  @Permissions('manage:roles')
  @ApiOperation({ summary: 'Search roles by name (for instant-search filter)' })
  async search(@Query('q') q?: string, @Query('limit') limit?: number) {
    return this.rolesService.search(q, limit);
  }

  @Get(':id')
  @Permissions('manage:roles')
  @ApiOperation({ summary: 'Get role by ID' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Put(':id')
  @Permissions('manage:roles')
  @ApiOperation({ summary: 'Update role' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateRoleDto>) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('manage:roles')
  @ApiOperation({ summary: 'Delete role' })
  async remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }

  @Post(':id/permissions')
  @Permissions('manage:roles')
  @ApiOperation({ summary: 'Assign permissions to role' })
  async assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    return this.rolesService.assignPermissions(id, dto);
  }

  @Post('bulk/delete')
  @Permissions('manage:roles')
  @ApiOperation({ summary: 'Bulk soft-delete roles (skips system roles)' })
  async bulkRemove(@Body() dto: BulkIdsDto) {
    return this.rolesService.bulkRemove(dto.ids);
  }
}

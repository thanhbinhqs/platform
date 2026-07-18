import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '@platform/platform-kernel';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { BulkIdsDto } from '../common/dto/bulk-ids.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions('manage:users')
  @ApiOperation({ summary: 'Create a new user' })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Permissions('read:users', 'manage:users')
  @ApiOperation({ summary: 'List all users' })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.usersService.findAll({ page, limit });
  }

  @Get(':id')
  @Permissions('read:users', 'manage:users')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @Permissions('manage:users')
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('manage:users')
  @ApiOperation({ summary: 'Delete user (soft)' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post('bulk/delete')
  @Permissions('manage:users')
  @ApiOperation({ summary: 'Bulk soft-delete users' })
  async bulkRemove(@Body() dto: BulkIdsDto) {
    return this.usersService.bulkRemove(dto.ids);
  }

  @Post('bulk/activate')
  @Permissions('manage:users')
  @ApiOperation({ summary: 'Bulk activate users' })
  async bulkActivate(@Body() dto: BulkIdsDto) {
    return this.usersService.bulkActivate(dto.ids);
  }

  @Post('bulk/deactivate')
  @Permissions('manage:users')
  @ApiOperation({ summary: 'Bulk deactivate users' })
  async bulkDeactivate(@Body() dto: BulkIdsDto) {
    return this.usersService.bulkDeactivate(dto.ids);
  }
}

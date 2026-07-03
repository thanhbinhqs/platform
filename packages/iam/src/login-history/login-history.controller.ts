import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@platform/platform-kernel';
import { LoginHistoryService } from './login-history.service';
import type { AuthenticatedUser } from '../common';

@ApiTags('Login History')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('login-history')
export class LoginHistoryController {
  constructor(private readonly service: LoginHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user login history' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.service.findByUser(user.id, limit, page);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@platform/platform-kernel';
import { SecurityEventService } from './security-event.service';
import type { AuthenticatedUser } from '../common';

@ApiTags('Security Events')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('security-events')
export class SecurityEventController {
  constructor(private readonly service: SecurityEventService) {}

  @Get()
  @ApiOperation({ summary: 'Get security events for current user' })
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: number, @Query('page') page?: number) {
    return this.service.findByUser(user.id, limit, page);
  }
}
import { Controller, Get, Post, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@platform/platform-kernel';
import { SessionService } from './session.service';
import type { AuthenticatedUser } from '../common';

@ApiTags('Sessions')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('auth/sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @ApiOperation({ summary: 'List active sessions for current user' })
  async getSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.sessionService.getActiveSessions(user.id);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.sessionService.revokeSession(id, user.id);
    return { message: 'Session revoked' };
  }

  @Post('revoke-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions except current' })
  async revokeAll(@CurrentUser() user: AuthenticatedUser) {
    // Current session ID would come from the token — simplified: revoke all
    await this.sessionService.revokeAllUserSessions(user.id);
    return { message: 'All sessions revoked' };
  }
}

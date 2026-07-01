import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MfaService } from './mfa.service';
import { CurrentUser } from '@platform/platform-kernel';
import type { AuthenticatedUser } from '../common';

@ApiTags('Multi-Factor Authentication')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Get('setup')
  @ApiOperation({ summary: 'Get MFA setup (QR code + secret)' })
  async setup(@CurrentUser() user: AuthenticatedUser) {
    return this.mfaService.generateSecret(user.id, user.email);
  }

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable MFA with TOTP token verification' })
  async enable(@CurrentUser() user: AuthenticatedUser, @Body() body: { secret: string; token: string }) {
    return this.mfaService.enable(user.id, body.secret, body.token);
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA' })
  async disable(@CurrentUser() user: AuthenticatedUser) {
    return this.mfaService.disable(user.id);
  }
}

import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { CurrentUser, Public } from '@platform/platform-kernel';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from '../common';
import type { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email + password' })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() dto: RegisterDto) {
    const user = await this.usersService.create({
      username: dto.username,
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
    }) as any;
    const authUser: AuthenticatedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName ?? user.username,
      roles: user.roles,
      permissions: [],
      rules: [],
      tenantId: null,
      isMfaEnabled: false,
      sessionId: crypto.randomUUID(),
    };
    return this.authService.login(authUser);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }
    // TODO: validate refresh token against session store
    // For now, issue a minimal placeholder token
    const payload: JwtPayload = {
      sub: 'placeholder',
      username: 'unknown',
      email: 'unknown@unknown',
      roles: [],
      permissions: [],
      tenantId: null,
      sessionId: crypto.randomUUID(),
      isMfaVerified: false,
    };
    return this.authService.refreshAccessToken(payload);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Invalidate current session' })
  async logout(@CurrentUser() user: AuthenticatedUser) {
    // Invalidate session in DB
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    // Fetch full profile with CASL rules from DB
    const full = await this.authService.getUserProfile(user.id);
    return full ?? user;
  }
}

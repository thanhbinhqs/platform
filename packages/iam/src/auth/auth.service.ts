import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type { AuthenticatedUser } from '../common';
import type { JwtPayload } from './strategies/jwt.strategy';
import {
  SALT_ROUNDS,
  MAX_LOGIN_ATTEMPTS,
  LOCK_DURATION_MINUTES,
} from '../common/constants/iam.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly jwtService: JwtService) {}

  async validateUser(email: string, password: string): Promise<AuthenticatedUser> {
    // In production, query DB via PrismaService
    // const user = await this.prisma.user.findUnique({ where: { email } });
    // if (!user) throw new UnauthorizedException('Invalid credentials');
    //
    // const isValid = await bcrypt.compare(password, user.passwordHash);
    // if (!isValid) throw new UnauthorizedException('Invalid credentials');

    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: AuthenticatedUser): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionId = uuidv4();
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles.map((r) => r.name),
      permissions: user.permissions,
      tenantId: user.tenantId,
      sessionId,
      isMfaVerified: !user.isMfaEnabled,
    };

    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_EXPIRATION ?? '15m',
      } as any),
      refreshToken: uuidv4(),
    };
  }

  async refreshAccessToken(payload: JwtPayload): Promise<{ accessToken: string }> {
    const newPayload: JwtPayload = {
      ...payload,
      iat: undefined,
    };

    return {
      accessToken: this.jwtService.sign(newPayload, {
        expiresIn: process.env.JWT_EXPIRATION ?? '15m',
      } as any),
    };
  }
}

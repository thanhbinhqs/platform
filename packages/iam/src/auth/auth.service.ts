import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@platform/platform-core';
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

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.client.user.findUnique({
      where: { email, deletedAt: null },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        status: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        tenantId: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: { action: true, resource: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked or inactive
    if (user.status === 'LOCKED' && user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked');
    }
    if (user.status === 'INACTIVE' || user.status === 'DELETED') {
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const attempts = user.failedLoginAttempts + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts: attempts };

      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.status = 'LOCKED';
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      }

      await this.prisma.client.user.update({
        where: { id: user.id },
        data: updateData as any,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on success
    if (user.failedLoginAttempts > 0 || user.status === 'LOCKED') {
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, status: 'ACTIVE', lockedUntil: null } as any,
      });
    }

    // Extract roles and permissions through the pivot table
    const roles = user.roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
    }));

    const permissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => `${rp.permission.action}:${rp.permission.resource}`),
    );

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.username,
      roles,
      permissions,
      tenantId: user.tenantId ?? null,
      isMfaEnabled: false,
      sessionId: uuidv4(),
    };
  }

  async login(user: AuthenticatedUser): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles.map((r) => r.name),
      permissions: user.permissions,
      tenantId: user.tenantId,
      sessionId: user.sessionId,
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

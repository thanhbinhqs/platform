import { Injectable, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@platform/platform-core';
import { EmailService } from '@platform/platform-kernel';
import { randomBytes } from 'crypto';
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
    private readonly emailService: EmailService,
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
      await this.logLoginHistory(user.id, 'FAILED_LOCKED');
      throw new UnauthorizedException('Account is temporarily locked');
    }
    if (user.status === 'INACTIVE' || user.status === 'DELETED') {
      await this.logLoginHistory(user.id, 'FAILED_INVALID_CREDENTIALS');
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

      await this.logLoginHistory(user.id, 'FAILED_INVALID_CREDENTIALS');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on success
    if (user.failedLoginAttempts > 0 || user.status === 'LOCKED') {
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, status: 'ACTIVE', lockedUntil: null } as any,
      });
    }

    // Log successful login
    await this.logLoginHistory(user.id, 'SUCCESS');

    // Extract roles and permissions through the pivot table
    const roles = user.roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
    }));

    // Role-based permissions
    const rolePermissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => `${rp.permission.action}:${rp.permission.resource}`),
    );

    // User-level permissions (ALLOW / DENY)
    const userPerms = await this.prisma.client.userPermission.findMany({
      where: { userId: user.id },
      include: { permission: { select: { action: true, resource: true } } },
    });

    const allowPerms = new Set<string>();
    const denyPerms = new Set<string>();
    for (const up of userPerms) {
      const key = `${up.permission.action}:${up.permission.resource}`;
      if (up.effect === 'DENY') denyPerms.add(key);
      else allowPerms.add(key);
    }

    // Merge: start with role perms, add explicit ALLOW, remove DENY
    const mergedPermissions = [
      ...new Set([...rolePermissions, ...allowPerms]),
    ].filter((p) => !denyPerms.has(p));

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.username,
      roles,
      permissions: mergedPermissions,
      tenantId: user.tenantId ?? null,
      isMfaEnabled: false,
      sessionId: uuidv4(),
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    this.logger.log(`Password changed for user ${userId}`);
    return { success: true, message: 'Password updated successfully' };
  }

  private async logLoginHistory(userId: string, status: string) {
    try {
      await this.prisma.client.loginHistory.create({
        data: { userId, status } as any,
      });
    } catch {
      // Don't break login flow if logging fails
    }
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
    // Build a clean payload with only the fields jsonwebtoken understands
    const clean: Record<string, unknown> = {};
    clean.sub = payload.sub;

    return {
      accessToken: this.jwtService.sign(clean, {
        expiresIn: process.env.JWT_EXPIRATION ?? '15m',
      } as any),
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.client.user.findUnique({
      where: { email, deletedAt: null },
      select: { id: true, email: true },
    });

    if (!user) {
      // Don't reveal whether the email exists
      return { message: 'If the email exists, a reset link has been sent.' };
    }

    // Invalidate any existing unused tokens
    await this.prisma.client.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date(0) }, // Expire immediately
    });

    // Create new token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.client.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const resetLink = `${process.env.APP_URL ?? 'http://localhost:3001'}/reset-password?token=${token}`;
    await this.emailService.sendPasswordReset(user.email, resetLink);

    this.logger.log(`Password reset requested for ${email}`);
    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const resetToken = await this.prisma.client.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { id: true } } },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.client.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: newHash },
    });

    // Mark token as used
    await this.prisma.client.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    // Revoke all sessions for security
    await this.prisma.client.session.updateMany({
      where: { userId: resetToken.userId, isActive: true },
      data: { isActive: false },
    });

    this.logger.log(`Password reset completed for user ${resetToken.userId}`);
    return { message: 'Password has been reset successfully.' };
  }
}

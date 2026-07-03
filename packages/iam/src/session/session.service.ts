import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@platform/platform-core';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSession(
    userId: string,
    refreshToken: string,
    metadata?: { deviceInfo?: string; ipAddress?: string; userAgent?: string },
  ): Promise<{ id: string; userId: string; refreshToken: string; deviceInfo: string | null; ipAddress: string | null; userAgent: string | null; isActive: boolean; expiresAt: Date; createdAt: Date }> {
    const session = await this.prisma.client.session.create({
      data: {
        userId,
        refreshToken,
        deviceInfo: metadata?.deviceInfo ?? null,
        ipAddress: metadata?.ipAddress ?? null,
        userAgent: metadata?.userAgent ?? null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
    return session;
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.prisma.client.session.findUnique({
      where: { id: sessionId },
    });
    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return false;
    }
    return true;
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.client.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    await this.prisma.client.session.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
    this.logger.log(`Session ${sessionId} revoked by user ${userId}`);
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    await this.prisma.client.session.updateMany({
      where: {
        userId,
        isActive: true,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { isActive: false },
    });
    this.logger.log(`All sessions revoked for user ${userId}`);
  }

  async getActiveSessions(userId: string) {
    return this.prisma.client.session.findMany({
      where: { userId, isActive: true, expiresAt: { gt: new Date() } },
      orderBy: { lastActivityAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastActivityAt: true,
        expiresAt: true,
      },
    });
  }
}

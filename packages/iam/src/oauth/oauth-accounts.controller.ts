import { Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@platform/platform-kernel';
import { PrismaService } from '@platform/platform-core';
import type { AuthenticatedUser } from '../common';

@ApiTags('OAuth Accounts')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('oauth-accounts')
export class OAuthAccountsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List linked OAuth accounts' })
  async findAll(@CurrentUser() u: AuthenticatedUser): Promise<any> {
    return this.prisma.client.oAuthAccount.findMany({
      where: { userId: u.id },
      select: { id: true, provider: true, email: true, name: true, createdAt: true },
    } as any);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlink OAuth account' })
  async remove(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string): Promise<any> {
    return this.prisma.client.oAuthAccount.deleteMany({ where: { id, userId: u.id } } as any);
  }
}
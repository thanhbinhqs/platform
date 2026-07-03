import { Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@platform/platform-kernel';
import { randomBytes } from 'crypto';
import type { AuthenticatedUser } from '../common';

// In-memory store for development — replace with DB model in production
const keyStore = new Map<string, { id: string; userId: string; name: string; key: string; createdAt: Date }>();
let keyCounter = 0;

@ApiTags('API Keys')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('api-keys')
export class ApiKeysController {
  @Get()
  @ApiOperation({ summary: 'List API keys' })
  async findAll(@CurrentUser() u: AuthenticatedUser): Promise<any> {
    const keys = Array.from(keyStore.values())
      .filter(k => k.userId === u.id)
      .map(k => ({ id: k.id, name: k.name, key: `${k.key.slice(0, 8)}...${k.key.slice(-4)}`, createdAt: k.createdAt }));
    return keys;
  }

  @Post()
  @ApiOperation({ summary: 'Create API key (shown once)' })
  async create(@CurrentUser() u: AuthenticatedUser, @Body() body: { name: string }): Promise<any> {
    const id = `ak_${++keyCounter}`;
    const rawKey = `pk_${randomBytes(24).toString('hex')}`;
    keyStore.set(id, { id, userId: u.id, name: body.name || 'Untitled', key: rawKey, createdAt: new Date() });
    return { id, name: body.name, rawKey, message: 'Save this key — it will not be shown again.' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke API key' })
  async remove(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string): Promise<any> {
    const entry = keyStore.get(id);
    if (entry?.userId === u.id) keyStore.delete(id);
    return { success: true };
  }
}
import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '@platform/platform-kernel';
import { PrismaService } from '@platform/platform-core';

@ApiTags('Storage')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('storage')
export class StorageController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('buckets')
  @Permissions('read:storage')
  @ApiOperation({ summary: 'List storage buckets' })
  async listBuckets(): Promise<any> {
    return this.prisma.client.storageBucket.findMany({ orderBy: { createdAt: 'desc' } } as any);
  }

  @Post('buckets')
  @Permissions('manage:storage')
  @ApiOperation({ summary: 'Create bucket' })
  async createBucket(@Body() b: any): Promise<any> {
    return this.prisma.client.storageBucket.create({
      data: { name: b.name, provider: b.provider || 'LOCAL', isPublic: b.isPublic ?? false },
    } as any);
  }

  @Get('files')
  @Permissions('read:storage')
  @ApiOperation({ summary: 'List files (pass bucketId in body)' })
  async listFiles(@Body() q: any): Promise<any> {
    const where: any = { bucketId: q?.bucketId || undefined };
    return this.prisma.client.storageFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    } as any);
  }
}

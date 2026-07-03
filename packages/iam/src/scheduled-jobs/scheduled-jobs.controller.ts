import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '@platform/platform-kernel';
import { PrismaService } from '@platform/platform-core';
@ApiTags('Scheduled Jobs')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('scheduled-jobs')
export class ScheduledJobsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @Permissions('manage:settings')
  @ApiOperation({ summary: 'List scheduled jobs' })
  async findAll(): Promise<any> { return this.prisma.client.scheduledJob.findMany({ include: { _count: { select: { executions: true } } }, orderBy: { createdAt: 'desc' } } as any); }
  @Post() @Permissions('manage:settings')
  @ApiOperation({ summary: 'Create scheduled job' })
  async create(@Body() b: any): Promise<any> { return this.prisma.client.scheduledJob.create({ data: { name: b.name, type: b.type || 'SCRIPT', cronExpression: b.cronExpression || '0 0 * * *', config: b.config || {}, isActive: b.isActive ?? b.enabled ?? true } } as any); }
  @Post('trigger') @Permissions('manage:settings')
  @ApiOperation({ summary: 'Trigger job execution' })
  async trigger(@Body() b: { jobId: string }): Promise<any> {
    return this.prisma.client.jobExecution.create({ data: { jobId: b.jobId, status: 'PENDING', scheduledAt: new Date() } } as any);
  }
}
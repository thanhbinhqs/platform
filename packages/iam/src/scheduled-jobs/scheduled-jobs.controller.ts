import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '@platform/platform-core';
import { Permissions } from '@platform/platform-kernel';

@ApiTags('Scheduled Jobs')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('scheduled-jobs')
export class ScheduledJobsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'List scheduled jobs' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string, @Query('sortField') sortField?: string, @Query('sortDir') sortDir?: string): Promise<any> {
    const pg = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(limit) || 20));
    const sk = (pg - 1) * ps;
    const wh: any = {};
    if (search) wh.OR = [{ name: { contains: search, mode: 'insensitive' } }];
    const ob: any = sortField ? { [sortField]: (sortDir || 'asc') as any } : { createdAt: 'desc' };
    const [data, total] = await Promise.all([
      this.prisma.client.scheduledJob.findMany({ where: wh, skip: sk, take: ps, orderBy: ob, include: { _count: { select: { executions: true } } } }),
      this.prisma.client.scheduledJob.count({ where: wh }),
    ]);
    return { data, total, page: pg, pageSize: ps, totalPages: Math.ceil(total / ps) };
  }

  @Post()
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Create scheduled job' })
  async create(@Body() b: any): Promise<any> {
    return this.prisma.client.scheduledJob.create({ data: { name: b.name, type: b.type || 'SCRIPT', cronExpression: b.cronExpression || '0 0 * * *', config: b.config || {}, isActive: b.isActive ?? true } } as any);
  }

  @Post('trigger')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Trigger job execution' })
  async trigger(@Body() b: { jobId: string }): Promise<any> {
    const job = await this.prisma.client.scheduledJob.findUnique({ where: { id: b.jobId } });
    if (!job) throw new Error('Job not found');
    return this.prisma.client.jobExecution.create({ data: { jobId: b.jobId, status: 'PENDING' as any, startedAt: new Date() } });
  }
}

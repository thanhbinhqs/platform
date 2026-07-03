import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions, CurrentUser } from '@platform/platform-kernel';
import { PrismaService } from '@platform/platform-core';
import type { AuthenticatedUser } from '../common';

@ApiTags('Workflows')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Definitions ───
  @Get()
  @Permissions('read:workflows')
  @ApiOperation({ summary: 'List workflow definitions' })
  async findAll(@Query('status') status?: string): Promise<any> {
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    return this.prisma.client.workflowDefinition.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { _count: { select: { steps: true, executions: true } } },
    } as any);
  }

  @Get(':id')
  @Permissions('read:workflows')
  @ApiOperation({ summary: 'Get workflow with steps and transitions' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.prisma.client.workflowDefinition.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { order: 'asc' } },
        transitions: { include: { fromStep: true, toStep: true } },
        schedules: true,
      },
    } as any);
  }

  @Post()
  @Permissions('manage:workflows')
  @ApiOperation({ summary: 'Create workflow definition' })
  async create(@Body() b: any): Promise<any> {
    return this.prisma.client.workflowDefinition.create({
      data: {
        name: b.name, description: b.description, triggerType: b.triggerType || 'MANUAL',
        triggerConfig: b.triggerConfig || {}, tags: b.tags || [],
        steps: b.steps ? { create: b.steps.map((s: any, i: number) => ({ name: s.name, type: s.type, config: s.config || {}, order: s.order ?? i + 1 })) } : undefined,
      },
    } as any);
  }

  @Put(':id')
  @Permissions('manage:workflows')
  @ApiOperation({ summary: 'Update workflow definition' })
  async update(@Param('id') id: string, @Body() b: any): Promise<any> {
    return this.prisma.client.workflowDefinition.update({ where: { id }, data: b } as any);
  }

  @Delete(':id')
  @Permissions('manage:workflows')
  @ApiOperation({ summary: 'Archive workflow' })
  async remove(@Param('id') id: string): Promise<any> {
    return this.prisma.client.workflowDefinition.update({ where: { id }, data: { status: 'ARCHIVED', deletedAt: new Date() } } as any);
  }

  @Post(':id/publish')
  @Permissions('manage:workflows')
  @ApiOperation({ summary: 'Publish workflow (DRAFT → ACTIVE)' })
  async publish(@Param('id') id: string): Promise<any> {
    return this.prisma.client.workflowDefinition.update({ where: { id }, data: { status: 'ACTIVE' } } as any);
  }

  // ─── Steps ───
  @Post(':id/steps')
  @Permissions('manage:workflows')
  @ApiOperation({ summary: 'Add step to workflow' })
  async addStep(@Param('id') workflowId: string, @Body() b: any): Promise<any> {
    const lastStep = await this.prisma.client.workflowStep.findFirst({ where: { workflowId }, orderBy: { order: 'desc' } } as any);
    return this.prisma.client.workflowStep.create({
      data: { workflowId, name: b.name, type: b.type, config: b.config || {}, order: b.order ?? (lastStep ? lastStep.order + 1 : 1) },
    } as any);
  }

  @Delete('steps/:stepId')
  @Permissions('manage:workflows')
  @ApiOperation({ summary: 'Remove step' })
  async removeStep(@Param('stepId') stepId: string): Promise<any> {
    return this.prisma.client.workflowStep.delete({ where: { id: stepId } } as any);
  }

  // ─── Transitions ───
  @Post(':id/transitions')
  @Permissions('manage:workflows')
  @ApiOperation({ summary: 'Create transition between steps' })
  async addTransition(@Param('id') workflowId: string, @Body() b: { fromStepId: string; toStepId: string; label?: string; condition?: any }): Promise<any> {
    return this.prisma.client.workflowTransition.create({ data: { workflowId, fromStepId: b.fromStepId, toStepId: b.toStepId, label: b.label, condition: b.condition || {} } } as any);
  }

  @Delete('transitions/:id')
  @Permissions('manage:workflows')
  @ApiOperation({ summary: 'Remove transition' })
  async removeTransition(@Param('id') id: string): Promise<any> {
    return this.prisma.client.workflowTransition.delete({ where: { id } } as any);
  }

  // ─── Executions ───
  @Post(':id/execute')
  @Permissions('execute:workflows')
  @ApiOperation({ summary: 'Trigger workflow execution' })
  async execute(@Param('id') workflowId: string, @CurrentUser() u: AuthenticatedUser, @Body() b: { input?: any }): Promise<any> {
    const workflow: any = await this.prisma.client.workflowDefinition.findUnique({ where: { id: workflowId }, include: { steps: { orderBy: { order: 'asc' } } } } as any);
    if (!workflow) throw new Error('Workflow not found');
    const execution = await this.prisma.client.workflowExecution.create({
      data: { workflowId, triggeredBy: u.id, input: b.input || {}, status: 'RUNNING', startAt: new Date() },
    } as any);
    // Create execution step records
    if (workflow.steps?.length) {
      await this.prisma.client.workflowExecutionStep.createMany({
        data: workflow.steps.map((s: any) => ({ executionId: execution.id, stepId: s.id, status: 'PENDING' })),
      } as any);
    }
    return { ...execution, steps: workflow.steps };
  }

  @Get(':id/executions')
  @Permissions('read:workflows')
  @ApiOperation({ summary: 'List executions for a workflow' })
  async listExecutions(@Param('id') workflowId: string): Promise<any> {
    return this.prisma.client.workflowExecution.findMany({
      where: { workflowId }, orderBy: { createdAt: 'desc' }, take: 50,
      include: { steps: { include: { step: { select: { name: true, type: true } } } } },
    } as any);
  }

  // ─── Schedules ───
  @Get(':id/schedules')
  @Permissions('read:workflows')
  @ApiOperation({ summary: 'List schedules for workflow' })
  async listSchedules(@Param('id') workflowId: string): Promise<any> {
    return this.prisma.client.workflowSchedule.findMany({ where: { workflowId } } as any);
  }

  @Post(':id/schedules')
  @Permissions('manage:workflows')
  @ApiOperation({ summary: 'Create schedule for workflow' })
  async createSchedule(@Param('id') workflowId: string, @Body() b: any): Promise<any> {
    return this.prisma.client.workflowSchedule.create({
      data: { workflowId, cronExpression: b.cronExpression, timezone: b.timezone || 'UTC', input: b.input || {}, enabled: b.enabled ?? true },
    } as any);
  }
}
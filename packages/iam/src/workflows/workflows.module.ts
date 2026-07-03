import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { WorkflowsController } from './workflows.controller';

@Module({ imports: [PrismaModule], controllers: [WorkflowsController] })
export class WorkflowsModule {}
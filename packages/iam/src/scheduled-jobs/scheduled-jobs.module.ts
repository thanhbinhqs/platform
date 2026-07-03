import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { ScheduledJobsController } from './scheduled-jobs.controller';
@Module({ imports: [PrismaModule], controllers: [ScheduledJobsController] })
export class ScheduledJobsModule {}
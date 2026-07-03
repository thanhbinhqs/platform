import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { DelegationsController } from './delegations.controller';
@Module({ imports: [PrismaModule], controllers: [DelegationsController] })
export class DelegationsModule {}
import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { RulesController } from './rules.controller';
@Module({ imports: [PrismaModule], controllers: [RulesController] })
export class RulesModule {}
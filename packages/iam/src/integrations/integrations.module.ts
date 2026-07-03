import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { IntegrationsController } from './integrations.controller';
@Module({ imports: [PrismaModule], controllers: [IntegrationsController] })
export class IntegrationsModule {}
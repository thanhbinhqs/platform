import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { WebhooksController } from './webhooks.controller';
@Module({ imports: [PrismaModule], controllers: [WebhooksController] })
export class WebhooksModule {}
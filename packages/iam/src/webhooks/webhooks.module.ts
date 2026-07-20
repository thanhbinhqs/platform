import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
@Module({ imports: [PrismaModule], controllers: [WebhooksController], providers: [WebhooksService] })
export class WebhooksModule {}
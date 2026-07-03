import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { NotificationsController } from './notifications.controller';
@Module({ imports: [PrismaModule], controllers: [NotificationsController] })
export class NotificationsModule {}
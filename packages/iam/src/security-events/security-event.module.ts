import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { SecurityEventController } from './security-event.controller';
import { SecurityEventService } from './security-event.service';

@Module({
  imports: [PrismaModule],
  controllers: [SecurityEventController],
  providers: [SecurityEventService],
  exports: [SecurityEventService],
})
export class SecurityEventsModule {}
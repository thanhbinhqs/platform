import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { PermissionsController } from './permissions.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController],
})
export class PermissionsModule {}

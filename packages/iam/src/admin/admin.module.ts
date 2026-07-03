import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { FeatureFlagsController } from './feature-flags.controller';
import { SettingsConfigController } from './settings-config.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FeatureFlagsController, SettingsConfigController],
})
export class AdminModule {}
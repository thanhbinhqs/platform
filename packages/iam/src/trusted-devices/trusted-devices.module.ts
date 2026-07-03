import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { TrustedDevicesController } from './trusted-devices.controller';
@Module({ imports: [PrismaModule], controllers: [TrustedDevicesController] })
export class TrustedDevicesModule {}
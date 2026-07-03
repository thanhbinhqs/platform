import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { StorageController } from './storage.controller';
@Module({ imports: [PrismaModule], controllers: [StorageController] })
export class StorageModule {}
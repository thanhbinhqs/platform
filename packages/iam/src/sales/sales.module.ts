import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({ imports: [PrismaModule], controllers: [SalesController], providers: [SalesService], exports: [SalesService] })
export class SalesModule {}
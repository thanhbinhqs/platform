import { Module } from '@nestjs/common';
import { PrismaModule } from '@platform/platform-core';
import { TenantsController } from './tenants.controller';

@Module({ imports: [PrismaModule], controllers: [TenantsController] })
export class TenantsModule {}
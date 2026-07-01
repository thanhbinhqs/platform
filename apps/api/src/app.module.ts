import { Module } from '@nestjs/common';
import { KernelModule } from '@platform/platform-kernel';
import { ConfigModule, HealthModule, PrismaModule } from '@platform/platform-core';
import { IamModule } from '@platform/iam';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Platform kernel (global filters, interceptors, guards)
    KernelModule,

    // Core infrastructure
    ConfigModule,
    HealthModule,

    // Database
    PrismaModule,

    // IAM (authentication, users, roles, MFA)
    IamModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

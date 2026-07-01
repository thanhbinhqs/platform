import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { KernelModule } from '@platform/platform-kernel';
import { ConfigModule } from '@platform/platform-core';
import { HealthModule } from '@platform/platform-core';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Platform kernel (global filters, interceptors, guards)
    KernelModule,

    // Core infrastructure
    ConfigModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Helmet security headers
    // Applied in main.ts via app.use(helmet())
  }
}

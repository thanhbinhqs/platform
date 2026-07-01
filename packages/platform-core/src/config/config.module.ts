import { Global, Module, type OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from './config.service';
import { configSchema, type Config } from './config.schema';

/**
 * Validates environment variables against the Zod schema
 * and provides a typed ConfigService provider.
 */
function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map(
      (e) => `  ${e.path.join('.')}: ${e.message}`,
    );
    throw new Error(
      `Environment validation failed:\n${errors.join('\n')}\n\n` +
        'Check your .env file and ensure all required variables are set.',
    );
  }

  return result.data;
}

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: () => new ConfigService(loadConfig()),
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule implements OnModuleInit {
  private readonly logger = new Logger(ConfigModule.name);

  onModuleInit(): void {
    this.logger.log('ConfigModule initialized — environment validated');
  }
}

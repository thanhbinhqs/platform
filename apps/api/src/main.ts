/**
 * Platform API — Bootstrap
 *
 * Initializes:
 * 1. OpenTelemetry (optional, if OTLP_ENDPOINT is set)
 * 2. NestJS application with Express adapter
 * 3. Swagger/OpenAPI documentation
 * 4. Security middleware (helmet, CORS)
 * 5. Global pipes, interceptors, and filters
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { initTelemetry } from '@platform/platform-core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // 1. OpenTelemetry (before NestJS to capture startup)
  await initTelemetry('platform-api');

  // 2. Create NestJS application
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    bufferLogs: false,
    snapshot: true,
  });

  // 3. Security middleware
  app.use(helmet());

  // 4. CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // 5. Global prefix
  const apiPrefix = `${process.env.API_PREFIX ?? 'api'}/v${process.env.API_VERSION ?? '1'}`;
  app.setGlobalPrefix(apiPrefix);

  // 6. Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 7. Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Platform API')
    .setDescription('Enterprise Full‑Stack Application Platform')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  // 8. Start server
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen(port, host);

  logger.log(`Application running on http://${host}:${port}/${apiPrefix}`);
  logger.log(`Swagger docs at http://${host}:${port}/${apiPrefix}/docs`);
}

void bootstrap();

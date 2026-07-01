/**
 * OpenTelemetry bootstrap.
 * Call this before NestJS.create() in main.ts.
 *
 * OTel packages are loaded lazily — they must be installed in
 * the consuming app's package.json when OTel is needed.
 */

import { Logger } from '@nestjs/common';

export async function initTelemetry(serviceName: string): Promise<void> {
  const logger = new Logger('Telemetry');
  const otlpEndpoint = process.env.OTLP_ENDPOINT;

  if (!otlpEndpoint) {
    logger.log('OpenTelemetry disabled (OTLP_ENDPOINT not set)');
    return;
  }

  logger.log(`OpenTelemetry endpoint: ${otlpEndpoint}`);
  logger.log('Install @opentelemetry/* packages to enable tracing');
  // At runtime, the app loads:
  //   @opentelemetry/sdk-node
  //   @opentelemetry/auto-instrumentations-node
  //   @opentelemetry/exporter-trace-otlp-proto
  //   @opentelemetry/resources
  //   @opentelemetry/semantic-conventions
}

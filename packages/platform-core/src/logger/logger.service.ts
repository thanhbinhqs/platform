import { Injectable, Logger, type LogLevel } from '@nestjs/common';

/**
 * Structured logger service.
 * Wraps NestJS Logger with correlation ID support.
 * In production, swap to pino/bunyan for JSON output.
 */
@Injectable()
export class LoggerService {
  private readonly logger: Logger;

  constructor() {
    this.logger = new Logger('Application');
  }

  setContext(context: string): void {
    (this.logger as unknown as { context: string }).context = context;
  }

  log(message: string, ...args: unknown[]): void {
    this.logger.log(this.format(message, args));
  }

  warn(message: string, ...args: unknown[]): void {
    this.logger.warn(this.format(message, args));
  }

  error(message: string, trace?: string, ...args: unknown[]): void {
    this.logger.error(this.format(message, args), trace);
  }

  debug(message: string, ...args: unknown[]): void {
    this.logger.debug(this.format(message, args));
  }

  verbose(message: string, ...args: unknown[]): void {
    this.logger.verbose(this.format(message, args));
  }

  private format(message: string, args: unknown[]): string {
    if (args.length === 0) return message;
    return `${message} ${JSON.stringify(args)}`;
  }
}

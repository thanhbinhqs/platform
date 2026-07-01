import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@platform/platform-kernel';

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Root endpoint — API info' })
  root(): Record<string, unknown> {
    return {
      name: 'Platform API',
      version: '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }
}

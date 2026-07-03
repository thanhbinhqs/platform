import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '@platform/platform-kernel';
import { AuditLogService } from './audit-log.service';
import type { Request } from 'express';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Permissions('read:audit-logs')
  @ApiOperation({ summary: 'List audit logs (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
  ): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.auditLogService.findAll({ page, limit, userId, action });
  }
}

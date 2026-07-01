// ═══════════════════════════════════════════════════════════════
// @platform/platform-kernel — Barrel Export
// ═══════════════════════════════════════════════════════════════

// ─── Base Layer ─────────────────────────────────────────────
export type { BaseEntity } from './base/base.entity';
export { BaseDto } from './base/base.dto';
export { BaseRepository } from './base/base.repository';
export { BaseService } from './base/base.service';

export type { IRepository } from './interfaces/repository.interface';
export type { IUnitOfWork } from './interfaces/unit-of-work.interface';
export type { IBaseService } from './interfaces/base-service.interface';
export type {
  FindManyOptions,
  CreateData,
  UpdateData,
  CursorPaginationOptions,
  CursorPaginatedResult,
} from './interfaces/repository.interface';

// ─── DTOs ───────────────────────────────────────────────────
export { ApiResponseDto, ApiErrorDto, ApiPaginatedResponse } from './dto/api-response.dto';
export { PaginatedDto, PaginationMeta } from './dto/pagination.dto';

// ─── Specification ──────────────────────────────────────────
export { Specification, AndSpecification, OrSpecification, NotSpecification, FieldSpecification } from './specification/specification';

// ─── Guards ─────────────────────────────────────────────────
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';
export { PermissionsGuard } from './guards/permissions.guard';
export { ThrottlerGuard } from './guards/throttler.guard';
export { ApiKeyGuard } from './guards/api-key.guard';
export { PublicGuard } from './guards/public.guard';

// ─── Decorators ─────────────────────────────────────────────
export { Public, IS_PUBLIC_KEY } from './decorators/public.decorator';
export { CurrentUser } from './decorators/current-user.decorator';
export { Roles, ROLES_KEY } from './decorators/roles.decorator';
export { Permissions, PERMISSIONS_KEY } from './decorators/permissions.decorator';

// ─── Filters ────────────────────────────────────────────────
export { HttpExceptionFilter } from './filters/http-exception.filter';
export { PrismaExceptionFilter } from './filters/prisma-exception.filter';
export { AllExceptionsFilter } from './filters/all-exceptions.filter';

// ─── Interceptors ───────────────────────────────────────────
export { LoggingInterceptor } from './interceptors/logging.interceptor';
export { TransformInterceptor } from './interceptors/transform.interceptor';
export { TimeoutInterceptor } from './interceptors/timeout.interceptor';
export { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

// ─── Pipes ──────────────────────────────────────────────────
export { ZodValidationPipe } from './pipes/validation.pipe';
export { ParseUUIDPipe } from './pipes/parse-uuid.pipe';

// ─── Constants ──────────────────────────────────────────────
export { ErrorCodes } from './constants/error-codes.constant';
export type { ErrorCode } from './constants/error-codes.constant';
export { ResponseMessages } from './constants/response-codes.constant';
export { THROTTLER_KEY, THROTTLER_TTL, THROTTLER_LIMIT } from './constants/throttler.constant';

// ─── Helpers ────────────────────────────────────────────────
export { generateId, generateOrderedId, isValidUuid } from './helpers/uuid.helper';
export { encrypt, decrypt, hashString, generateToken } from './helpers/crypto.helper';
export { formatDate, isExpired, addDays, durationMs } from './helpers/date.helper';

// ─── Module ─────────────────────────────────────────────────
export { KernelModule } from './kernel.module';

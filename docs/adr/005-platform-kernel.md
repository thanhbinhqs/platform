# ADR-005: Platform Kernel Architecture

## Status

Accepted

## Context

Every platform module needs consistent infrastructure for:
- CRUD operations with generic patterns
- Request validation and response transformation
- Authentication and authorization
- Exception handling and error responses
- Rate limiting and timeout protection
- Audit logging of mutations
- Cursor-based pagination
- Reusable query specification

Rather than duplicating this in every module, we build a kernel layer that
provides all cross-cutting concerns as reusable, testable building blocks.

## Decision

We create `@platform/platform-kernel` as a NestJS shared library containing:

### 1. Generic CRUD (Base Layer)
- `BaseEntity` interface — common fields (`id`, `createdAt`, `updatedAt`, `deletedAt`)
- `BaseDto` — Swagger-annotated response DTO base
- `IRepository<T>` — generic repository contract (find, create, update, soft-delete, cursor paginate)
- `BaseRepository<T>` — Prisma implementation with soft-delete filter middleware
- `IBaseService<T>` — service contract
- `BaseService<T>` — CRUD implementation with error handling

### 2. Specification Pattern
- Composite specifications (`And`, `Or`, `Not`, `Field`) for reusable query criteria
- Type-safe `toQuery()` for Prisma `where` clause generation

### 3. Cross-cutting Infrastructure
| Layer | Component | Responsibility |
|---|---|---|
| **Filters** | `AllExceptionsFilter` | Catch-all → 500 + structured error |
| | `HttpExceptionFilter` | NestJS HTTP errors → standard envelope |
| | `PrismaExceptionFilter` | Prisma errors → mapped HTTP codes |
| **Interceptors** | `TransformInterceptor` | Wrap responses in `{ success, data, meta }` |
| | `LoggingInterceptor` | Log method, URL, status, duration |
| | `TimeoutInterceptor` | 30s request timeout |
| | `AuditLogInterceptor` | Capture mutation details |
| **Guards** | `JwtAuthGuard` | Passport JWT authentication |
| | `RolesGuard` | RBAC via `@Roles()` |
| | `PermissionsGuard` | ABAC via `@Permissions()` |
| | `ThrottlerGuard` | In-memory rate limiter |
| | `ApiKeyGuard` | Machine-to-machine auth |
| **Pipes** | `ZodValidationPipe` | Schema-based request validation |
| | `ParseUUIDPipe` | UUID parameter validation |
| **Decorators** | `@CurrentUser()` | Extract authenticated user |
| | `@Public()` | Skip JWT auth |
| | `@Roles()` | Declare required roles |
| | `@Permissions()` | Declare required permissions |

### 4. KernelModule
A `@Global()` module that registers the following as application-wide providers:
- All three exception filters
- Transform, Logging, and Timeout interceptors
- JwtAuthGuard

## Consequences

**Positive:**
- Every module gets consistent error handling, auth, and response format automatically
- `BaseService<T>` + `BaseRepository<T>` reduces CRUD boilerplate by ~70%
- Specification pattern keeps query logic testable and composable
- `KernelModule` is a single import in the root `AppModule`

**Negative:**
- Global filters/interceptors add overhead to every request (mitigated: lightweight, async)
- Specification pattern adds complexity for simple queries (mitigated: plain `where` still works)
- Prisma-specific `BaseRepository` ties kernel to Prisma (acceptable: documented coupling)

## Technical Notes

- Package: `packages/platform-kernel/`
- Decorators use `SetMetadata` for role/permission reflection
- Guards use `Reflector` to read metadata at runtime
- Rate limiter is in-memory; swap to `@nestjs/throttler` + Redis for production
- UUID v4 generator in `helpers/uuid.helper.ts`
- AES-256-GCM encryption for sensitive fields in `helpers/crypto.helper.ts`

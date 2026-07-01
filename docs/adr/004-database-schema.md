# ADR-004: Database Schema with Prisma ORM

## Status

Accepted

## Context

We need a database design that:
- Supports 15 platform modules with clean separation
- Provides multi-tenancy (row-level)
- Enables soft-delete for data recovery
- Supports UUID primary keys for distributed readiness
- Generates a typed client for NestJS consumption
- Supports migrations in CI/CD

## Decision

### Single PostgreSQL Schema with Row-Level Tenant Isolation

Use a single PostgreSQL database with all tables in the `public` schema. Multi-tenancy is implemented via a `tenantId` foreign key column on every tenant-scoped table. Null `tenantId` indicates system-level entities.

### Prisma ORM

- **Prisma Client** as the typed database client
- **Prisma Migrate** for schema migrations
- Single `schema.prisma` file (828 lines, 34 models)
- Global soft-delete middleware via `$use()`

### Naming Convention

| Pattern | Example |
|---|---|
| Model name: PascalCase singular | `User`, `WorkflowDefinition` |
| Table name: snake_case plural | `users`, `workflow_definitions` |
| Primary key: `id` UUID | `@id @default(uuid())` |
| Foreign key: `{Model}Id` | `tenantId`, `userId` |

### 34 Models Across 11 Domains

| Domain | Models | Purpose |
|---|---|---|
| IAM | 14 | Identity, authentication, authorization |
| Workflow | 6 | Workflow orchestration |
| Rule Engine | 2 | Business rules |
| Notification | 4 | Multi-channel messaging |
| Audit | 2 | Immutable audit trail |
| Scheduler | 2 | Job scheduling |
| Storage | 2 | File management |
| Integration | 3 | External system connectors |
| Feature Flag | 2 | Feature toggles |
| Metadata | 2 | Dynamic metadata |
| Configuration | 1 | Key-value config |

### Indexing

- `@@index([tenantId])` on every tenant-scoped table
- `@@unique` on business key combinations
- Composite indexes on high-frequency query patterns
- Indexes on `createdAt` for time-range queries

### Security

- No full-text search on sensitive fields
- Password hashes stored in dedicated column
- OAuth tokens encrypted at application level
- Audit log is append-only

## Consequences

### Positive
- Single migration source simplifies CI/CD
- Prisma Client provides full type safety
- Row-level tenant isolation enables easy vertical scaling
- Soft delete prevents accidental data loss
- 34 models cover all platform modules with minimal redundancy

### Negative
- Single PostgreSQL instance is a scaling bottleneck (can be partitioned later)
- Schema file is large (828 lines, 26KB)
- No per-model Prisma client generation (single client for all)

## Related

- ADR-002: Monorepo Structure (Prisma lives in `@platform/platform-core`)
- ADR-003: Docker Deployment (PostgreSQL in Docker Compose)
- Phase 5: Platform Kernel (builds on all models)
- Phase 7: IAM (depends on IAM models)

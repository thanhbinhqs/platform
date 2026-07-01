# Database Schema Architecture

## Overview

This document describes all 34 database models organized by domain module.
The schema follows a single PostgreSQL database with row-level tenant isolation.

## Model Count by Domain

| Domain | Models | Tables |
|---|---|---|
| IAM | 13 | tenants, users, roles, permissions, user_roles, role_permissions, sessions, mfa_devices, oauth_accounts, trusted_devices, password_reset_tokens, login_history, security_events, delegations |
| Workflow Engine | 6 | workflow_definitions, workflow_steps, workflow_transitions, workflow_executions, workflow_execution_steps, workflow_schedules |
| Rule Engine | 2 | rules, rule_executions |
| Notification | 4 | notification_templates, notifications, notification_preferences, notification_groups |
| Audit | 2 | audit_logs, audit_policies |
| Scheduler | 2 | scheduled_jobs, job_executions |
| Storage | 2 | storage_buckets, storage_files |
| Integration | 3 | integrations, webhooks, webhook_deliveries |
| Feature Flag | 2 | feature_flags, feature_flag_segments |
| Metadata | 2 | metadata_schemas, metadata_entries |
| Configuration | 1 | configuration_entries |

## Naming Conventions

- **Table names**: snake_case, pluralized
- **Column names**: camelCase (Prisma convention)
- **Primary keys**: UUID v4 (`@default(uuid())`)
- **Foreign keys**: `{relatedModel}Id` in camelCase
- **Timestamps**: `createdAt`, `updatedAt`, `deletedAt`, `deletedBy`
- **Audit**: `metadata` (Json?) on most entities for extensibility

## Common Field Patterns

```prisma
id        String   @id @default(uuid())
tenantId  String?  // null = system-level entity
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
deletedAt DateTime?
deletedBy String?
metadata  Json?    // domain-specific extensions
```

## Indexing Strategy

- `tenantId` on every tenant-scoped table (for multi-tenant queries)
- Composite indexes on frequently filtered columns
- `@@unique` on business key combinations
- Timestamp indexes for time-range queries (audit logs, notifications)
- Status indexes for state-based queries

## Soft Delete

All business entities implement soft delete:
- `deletedAt: DateTime?` — timestamp when deleted
- `deletedBy: String?` — user who performed the delete
- Global Prisma middleware filters `deletedAt: null` on all queries
- Background job can purge records older than 90 days

## Seed Data

The `prisma/seed.ts` script creates:
1. A default Tenant
2. System permissions (20+ CRUD operations)
3. System roles (Super Admin, Admin)
4. Admin user (`admin@platform.local`)

## Migrations

```bash
# Development (auto-increment)
pnpm prisma:migrate

# Production (apply pending)
pnpm prisma:migrate:prod
```

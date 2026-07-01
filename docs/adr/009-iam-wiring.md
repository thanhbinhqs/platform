# ADR-009: IAM Wiring, Prisma Integration & Data Seeding

## Status

Accepted

## Context

After building the IAM module as a self-contained NestJS package in Phase 7, it contained only placeholder logic (stub `validateUser`, mock CRUD). The API application also didn't import the IAM module or the Prisma database module, making the platform non-functional at runtime.

A seed script with correct permission formats and a functioning admin user was also missing — the old script used a placeholder password hash (`$2b$10$...`) and an incompatible permission naming format (`user:create` prefix vs CASL-style `create:users`).

## Decision

1. **Wire IamModule + PrismaModule** into the API's `AppModule` — PrismaModule (Global) provides `PrismaService` injectable everywhere; IamModule brings all 7 sub-modules (Auth, Users, Roles, Authorization, Session, MFA).

2. **Remove stale MiddlewareConsumer** — the old `AppModule implements NestModule` was a leftover from an earlier approach; Helmet is applied in `main.ts` via `app.use(helmet())`.

3. **Add `@platform/platform-core` as peerDep** of `@platform/iam` — so IAM services can import and inject `PrismaService` without a direct dependency.

4. **Rewrite `AuthService.validateUser`** — replaced the stub with a real Prisma query that:
   - Fetches user with roles through the `UserRole → Role → RolePermission → Permission` pivot chain
   - Checks `status` enum (`ACTIVE`/`LOCKED`/`INACTIVE`/`DELETED`) instead of nonexistent `isActive`/`isLocked` booleans
   - Tracks `failedLoginAttempts` (matches schema `User.failedLoginAttempts`)
   - Resets status on successful login after lockout

5. **Rewrite `UsersService`** — replaced all stub CRUD methods with real Prisma queries:
   - Soft delete via `deletedAt` timestamp
   - Proper pivot handling: `roles: { create: [{ roleId }] }` and `role: { select: { id, name } }` nested selects
   - `formatUser()` helper to normalise pivot structure into flat `{ id, name }[]`

6. **Extend DTOs** — `CreateUserDto` now includes `tenantId` and `roleIds`; `UpdateUserDto` adds `password`, `isActive`, `roleIds`, `tenantId`.

7. **Rewrite seed script** (`packages/platform-core/prisma/seed.ts`):
   - Real bcrypt hash computed at runtime (`Admin@123456`)
   - CASL-style permissions (`action:resource` — `manage:users`, `read:roles`, etc.)
   - Tenant-agnostic `system` tenant + `default` tenant
   - `super_admin` role (system tenant, all permissions), `admin` role (default tenant, most permissions), `user` role (read-only workflows)
   - Admin user assigned `super_admin` role

8. **Add `.env`** with development defaults (no password PostgreSQL on localhost).

## Consequences

- The API server now compiles and wires all IAM controllers at `/api/v1/auth/*`, `/api/v1/users/*`, etc.
- Running requires a PostgreSQL instance (via local install or Docker).
- Migrations must be applied (`pnpm --filter @platform/platform-core prisma:migrate`) before seeding.
- End-to-end test sequence once DB is running: `register → login → /me → refresh → logout`.
- The seed script is versioned — `pnpm --filter @platform/platform-core prisma:seed` recreates dev data on any fresh database.

# ADR-007: IAM Module Architecture

## Status

Accepted

## Context

Every enterprise application needs identity and access management (IAM) covering:
- Authentication (JWT, refresh tokens, OAuth2/OIDC)
- Authorization (RBAC + ABAC via CASL)
- User management (CRUD, profile, password policy)
- Role and permission management
- Session management and token rotation
- Multi-factor authentication (TOTP)
- Account security (lockout, password history)

## Decision

Create a self-contained `@platform/iam` package with six sub-modules:

### Module Structure

```
@platform/iam/
├── AuthModule          JWT + Passport strategies, login/register/refresh
├── UsersModule         User CRUD with password hashing (bcryptjs)
├── RolesModule         Role CRUD + permission assignment
├── AuthorizationModule CASL AbilityFactory + PoliciesGuard
├── SessionModule       Token lifecycle, revocation, Valkey-backed
└── MfaModule           TOTP setup/verify via speakeasy + QR code
```

### Authentication Flow

```
POST /auth/register  → UsersService.create() + hashed password
POST /auth/login     → validateUser() → JWT (access + refresh)
POST /auth/refresh   → JwtRefreshStrategy → new access token
POST /auth/logout    → revoke session + blacklist refresh token
GET  /auth/me        → current user profile
```

### Authorization Strategy

Two complementary layers:
1. **RBAC** via `PoliciesGuard` — checks `user.permissions` against required permissions
2. **ABAC** via `AbilityFactory` (CASL) — fine-grained policy evaluation

Usage:
```typescript
@UseGuards(AuthGuard('jwt'), PoliciesGuard)
@SetMetadata(CHECK_POLICIES_KEY, ['user:read', 'user:write'])
```

### MFA Flow

```
GET  /mfa/setup     → Generate TOTP secret + QR code
POST /mfa/enable    → Verify token → persist device
POST /mfa/disable   → Remove MFA devices
```

### Session Management

- JWT session ID (`sessionId`) generated per login
- Refresh tokens stored in Valkey for revocation
- Bulk revocation on password change / admin force-logout

### Security Measures

| Feature | Implementation |
|---|---|
| Password hashing | bcryptjs, 12 salt rounds |
| Account lockout | 5 failed attempts → 30 min lock |
| Password policy | Min 8 chars, max 128 chars |
| JWT expiry | 15m access, 7d refresh (configurable) |
| MFA | TOTP (RFC 6238) via speakeasy |
| Session invalidation | Valkey-backed blacklist |

## Consequences

**Positive:**
- Complete IAM in a single package with clear sub-module boundaries
- Pluggable authorization via PoliciesGuard + CASL
- Ready for OAuth2/OIDC extension (add strategies in `auth/strategies/`)
- MFA support out of the box
- Token revocation via Valkey/SessionService

**Negative:**
- Initial user/Role CRUD services are placeholder stubs (Prisma queries TODO)
- OAuth2/OIDC strategies not yet implemented
- CASL AbilityFactory is a stub (full ABAC in later phase)
- Session service needs Valkey connection for production

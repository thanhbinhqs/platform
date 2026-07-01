// ═══════════════════════════════════════════════════════════════
// @platform/iam — Barrel Export
// ═══════════════════════════════════════════════════════════════

// ─── Root Module ────────────────────────────────────────────
export { IamModule } from './iam.module';

// ─── Auth ───────────────────────────────────────────────────
export { AuthModule } from './auth/auth.module';
export { AuthService } from './auth/auth.service';
export { JwtStrategy } from './auth/strategies/jwt.strategy';
export type { JwtPayload } from './auth/strategies/jwt.strategy';

// ─── Users ─────────────────────────────────────────────────
export { UsersModule } from './users/users.module';
export { UsersService } from './users/users.service';

// ─── Roles ─────────────────────────────────────────────────
export { RolesModule } from './roles/roles.module';
export { RolesService } from './roles/roles.service';

// ─── Authorization ─────────────────────────────────────────
export { AuthorizationModule } from './authorization/authorization.module';
export { PoliciesGuard, CHECK_POLICIES_KEY } from './authorization/policies.guard';
export { AbilityFactory } from './authorization/ability.factory';

// ─── Session ───────────────────────────────────────────────
export { SessionModule } from './session/session.module';
export { SessionService } from './session/session.service';

// ─── MFA ───────────────────────────────────────────────────
export { MfaModule } from './mfa/mfa.module';
export { MfaService } from './mfa/mfa.service';

// ─── Common ────────────────────────────────────────────────
export type { AuthenticatedUser, AuthenticatedRequest } from './common';
export {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  SALT_ROUNDS,
  MAX_LOGIN_ATTEMPTS,
  LOCK_DURATION_MINUTES,
  SESSION_TOKEN_LENGTH,
  REFRESH_TOKEN_EXPIRY_DAYS,
  MFA_ISSUER,
} from './common/constants/iam.constants';

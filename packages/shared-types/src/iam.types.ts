// ═══════════════════════════════════════════════════════════════
// @platform/shared-types — IAM Types
// ═══════════════════════════════════════════════════════════════

// ─── CASL Rule (matching @casl/ability RawRule) ──────────────
export interface CaslRule {
  action: string | string[];
  subject: string | string[];
  conditions?: Record<string, unknown>;
  inverted?: boolean;
  /** Optional reason, used for debugging */
  reason?: string;
}

// ─── User ──────────────────────────────────────────────────
export interface User {
  id: string;
  tenantId: string | null;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  roles: Role[];
  permissions: string[];
  /** CASL Ability rules (action + subject pairs for can() checks) */
  rules: CaslRule[];
  directPermissions?: UserPermissionOverride[];
  isMfaEnabled: boolean;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'SUSPENDED';

export interface UserPermissionOverride {
  id: string;
  action: string;
  resource: string;
  effect: 'ALLOW' | 'DENY';
  name: string;
}

// ─── Role ──────────────────────────────────────────────────
export interface Role {
  id: string;
  name: string;
  description: string | null;
  type: RoleType;
  permissions: Permission[];
  isSystem: boolean;
}

export type RoleType = 'SYSTEM' | 'CUSTOM';

// ─── Permission ────────────────────────────────────────────
export interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
}

// ─── Auth ──────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

// ─── Session ───────────────────────────────────────────────
export interface Session {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
}

// ─── MFA ───────────────────────────────────────────────────
export interface MfaSetupResponse {
  secret: string;
  qrCode: string;
}

export interface MfaEnableRequest {
  secret: string;
  token: string;
}

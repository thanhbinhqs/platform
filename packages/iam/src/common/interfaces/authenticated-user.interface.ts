import type { Request } from 'express';
import type { CaslRule } from '../../authorization/ability.factory';

export interface AuthenticatedUser {
  id: string;
  tenantId: string | null;
  username: string;
  email: string;
  displayName: string | null;
  roles: { id: string; name: string }[];
  /** Compact permission strings (used in JWT for PoliciesGuard) */
  permissions: string[];
  /** CASL rules (sent to frontend for ability.can() checks) */
  rules: CaslRule[];
  isMfaEnabled: boolean;
  sessionId: string;
  impersonatorId?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  tenantId: string | null;
  username: string;
  email: string;
  displayName: string | null;
  roles: { id: string; name: string }[];
  permissions: string[];
  isMfaEnabled: boolean;
  sessionId: string;
  impersonatorId?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

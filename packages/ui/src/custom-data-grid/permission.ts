// ═══════════════════════════════════════════════════════════════
// Permission — RBAC permission engine for rows/cells/actions
// ═══════════════════════════════════════════════════════════════

import type { PermissionEngine } from './types';

export class GridPermissionEngine implements PermissionEngine {
  constructor(private userRoles: string[] = [], private permissions: string[] = []) {}

  setRoles(roles: string[]) { this.userRoles = roles; }
  setPermissions(perms: string[]) { this.permissions = perms; }

  can(action: string, resource: string, _data?: Record<string, unknown>): boolean {
    return this.permissions.includes(`${action}:${resource}`) || this.permissions.includes(`manage:${resource}`) || this.permissions.includes('manage:system');
  }

  canRow(row: Record<string, unknown>, action: string): boolean {
    // Example: deny delete for rows created by other users
    const ownerId = row.createdBy as string | undefined;
    if (action === 'delete' && ownerId && ownerId !== 'current-user') {
      return this.permissions.includes('delete:any-record');
    }
    return this.can(action, 'row');
  }

  canCell(_row: Record<string, unknown>, column: string, action: string): boolean {
    return this.can(action, `column.${column}`);
  }
}

import { useAuthStore } from './use-auth-store';

/**
 * Check if the current user has a specific permission.
 * Supports both AND logic (single string) and OR logic (array).
 *
 * @param permission - Permission string like 'manage:users' or array of strings
 * @param mode - 'every' (default, AND) | 'some' (OR)
 */
export function usePermission(
  permission: string | string[],
  mode: 'every' | 'some' = 'every',
): boolean {
  const userPermissions = useAuthStore((s) => s.user?.permissions);

  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  const perms = Array.isArray(permission) ? permission : [permission];

  if (mode === 'some') {
    return perms.some((p) => userPermissions.includes(p));
  }

  return perms.every((p) => userPermissions.includes(p));
}

/**
 * Raw helper (not a hook) for checking permission inline.
 * Use in event handlers or conditional logic outside components.
 */
export function hasPermission(
  userPermissions: string[] | undefined | null,
  permission: string | string[],
  mode: 'every' | 'some' = 'every',
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  const perms = Array.isArray(permission) ? permission : [permission];
  if (mode === 'some') return perms.some((p) => userPermissions.includes(p));
  return perms.every((p) => userPermissions.includes(p));
}

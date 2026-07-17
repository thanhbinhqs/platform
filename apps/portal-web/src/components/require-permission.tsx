import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@platform/hooks';
import { hasModuleAccess } from '../lib/admin-modules';

interface RequirePermissionProps {
  resource: string;
  children: React.ReactNode;
}

/**
 * Route-level permission gate.
 * Redirects to /forbidden if the user lacks `read:{resource}` or `manage:{resource}`.
 */
export function RequirePermission({ resource, children }: RequirePermissionProps) {
  const user = useAuthStore((s) => s.user);
  const permissions = user?.permissions ?? [];

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasModuleAccess(permissions, resource)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}

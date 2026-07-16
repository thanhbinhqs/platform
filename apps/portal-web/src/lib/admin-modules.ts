import { useMemo } from 'react';
import { useAuthStore } from '@platform/hooks';
import type { LucideIcon } from 'lucide-react';
import {
  Users,
  Shield,
  Key,
  Activity,
  Package,
  ShoppingCart,
  FileText,
  Building,
  Flag,
  Clock,
  Link as LinkIcon,
  BellRing,
  HardDrive,
  Share2,
  FileCode,
  Settings,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────

export interface AdminModule {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** JWT resource name (lowercase, matches backend permission strings) */
  resource: string;
  /** Required action. 'read' = minimum view permission. */
  action: string;
}

// ─── Registry ──────────────────────────────────────────────
// Maps JWT permissions → admin UI metadata.
// resource = lowercase (matches backend permission strings like 'read:users').
// subject (Capitalized) = `resource.charAt(0).toUpperCase() + resource.slice(1)`

export const ADMIN_MODULES: AdminModule[] = [
  { id: 'users', label: 'Users', description: 'Manage user accounts', href: '/users', icon: Users, action: 'read', resource: 'users' },
  { id: 'roles', label: 'Roles', description: 'Role & permission management', href: '/roles', icon: Shield, action: 'read', resource: 'roles' },
  { id: 'audit-logs', label: 'Audit Logs', description: 'System activity trail', href: '/audit-logs', icon: Activity, action: 'read', resource: 'audit-logs' },
  { id: 'api-keys', label: 'API Keys', description: 'Manage API access keys', href: '/api-keys', icon: Key, action: 'read', resource: 'api-keys' },
  { id: 'settings', label: 'Settings', description: 'System configuration', href: '/settings', icon: Settings, action: 'read', resource: 'settings' },
  { id: 'products', label: 'Products', description: 'Product catalog', href: '/products', icon: Package, action: 'read', resource: 'products' },
  { id: 'orders', label: 'Orders', description: 'Customer orders', href: '/orders', icon: ShoppingCart, action: 'read', resource: 'orders' },
  { id: 'invoices', label: 'Invoices', description: 'Billing & invoices', href: '/invoices', icon: FileText, action: 'read', resource: 'invoices' },
  { id: 'tenants', label: 'Tenants', description: 'Multi-tenant management', href: '/tenants', icon: Building, action: 'read', resource: 'tenants' },
  { id: 'feature-flags', label: 'Feature Flags', description: 'Feature toggles', href: '/feature-flags', icon: Flag, action: 'read', resource: 'feature-flags' },
  { id: 'scheduled-jobs', label: 'Scheduled Jobs', description: 'Cron job management', href: '/scheduled-jobs', icon: Clock, action: 'read', resource: 'scheduled-jobs' },
  { id: 'integrations', label: 'Integrations', description: 'Third-party integrations', href: '/integrations', icon: LinkIcon, action: 'read', resource: 'integrations' },
  { id: 'webhooks', label: 'Webhooks', description: 'Webhook endpoints', href: '/webhooks', icon: FileCode, action: 'read', resource: 'webhooks' },
  { id: 'notifications', label: 'Notifications', description: 'Notification templates', href: '/notifications', icon: BellRing, action: 'read', resource: 'notifications' },
  { id: 'storage', label: 'Storage', description: 'File storage management', href: '/storage', icon: HardDrive, action: 'read', resource: 'storage' },
  { id: 'workflows', label: 'Workflows', description: 'Workflow definitions', href: '/workflows', icon: Share2, action: 'read', resource: 'workflows' },
];

// ─── Pure helper (testable) ───────────────────────────────

/**
 * Check if user has access to a specific admin module.
 * Uses JWT permission strings (trusted source).
 *
 * @param permissions - user.permissions from JWT payload
 * @param resource - lowercase resource name (e.g. 'users', 'roles')
 * @param action - required action ('read' | 'manage')
 */
export function hasModuleAccess(
  permissions: string[],
  resource: string,
  action: string = 'read',
): boolean {
  // Direct permission match
  if (permissions.includes(`${action}:${resource}`)) return true;
  // manage implies all actions
  if (permissions.includes(`manage:${resource}`)) return true;
  // Wildcard permissions
  if (permissions.includes('manage:all')) return true;
  if (permissions.includes('read:all')) return true;
  return false;
}

/**
 * Get all admin modules a user can access.
 * JWT-backed — cannot be faked by modifying CASL rules.
 */
export function getAccessibleModules(permissions: string[]): AdminModule[] {
  return ADMIN_MODULES.filter((m) => hasModuleAccess(permissions, m.resource, m.action));
}

/**
 * Quick check if user has ANY admin-level access.
 */
export function hasAnyAdminAccess(permissions: string[]): boolean {
  return ADMIN_MODULES.some((m) => hasModuleAccess(permissions, m.resource, m.action));
}

// ─── React hook ───────────────────────────────────────────

/**
 * useAdminModules() — JWT-backed hook.
 *
 * SECURITY: Derives admin module list from user.permissions (JWT, signed).
 * NOT from user.rules (CASL, can be tampered).
 *
 * If a hacker modifies 'rules' in DevTools, this hook still returns the
 * CORRECT module list because it reads directly from the JWT payload.
 */
export function useAdminModules() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);

  return useMemo(
    () => ({
      modules: getAccessibleModules(permissions),
      hasAnyAccess: hasAnyAdminAccess(permissions),
    }),
    [permissions],
  );
}

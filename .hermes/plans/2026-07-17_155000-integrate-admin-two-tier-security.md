# Integrate Admin Web into Portal Web — Two-Tier Security Model

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Merge `apps/admin-web` into `apps/portal-web` with a **two-tier security model** — admin module visibility derived from JWT-signed `permissions` array (trusted), fine-grained UI checks backed by CASL `rules` (convenience).

**Security Architecture:**

```
JWT (signed by server, cannot be tampered):
  permissions: ['read:users', 'manage:roles', ...]    ← TRUSTED SOURCE
  │
  ├─→ PermissionsGuard on every API endpoint (403 if missing)
  │   ↑ This is the REAL security boundary
  │
  └─→ Frontend admin-modules.ts:
      "Which admin modules can this user see?"
      Derived from user.permissions (JWT) → cannot be faked

/auth/me response (can be manipulated in DevTools):
  rules: CaslRule[] = [{ action:'read', subject:'Users' }, ...]  ← CONVENIENCE
  │
  └─→ usePermission('delete', 'Users'):
      "Can this user delete a specific user?"
      Uses rules → CAN be faked, but only toggles UI buttons
      Backend still blocks the actual DELETE API call
```

**Two tiers:**

| Layer | Data source | Verdict | Used for |
|-------|-------------|---------|----------|
| **Tier 1 — Module Discovery** | JWT `permissions: string[]` | ✅ Trusted (signed) | Admin sidebar, dashboard cards, route gating |
| **Tier 2 — Fine-Grained UI** | API `rules: CaslRule[]` | ⚠️ Convenience (can be faked) | Button visibility within pages, form field access |

**Key rule:** A hacker who modifies `rules` in DevTools can see fake menu items (Tier 2 false positives), but:
1. They cannot derive the admin module list from `rules` — Tier 1 uses JWT
2. They cannot call APIs they lack permissions for — `PermissionsGuard` checks JWT
3. They cannot access data they shouldn't — backend enforces on every endpoint

**Tech Stack:** React 19 + Vite 6 + JWT (permissions) + CASL (`usePermission` from `@platform/hooks`) + `@platform/shared-types` (CaslRule, User)

---
## Permission Model Reference

### JWT permissions format (trusted)
```typescript
// Stored in user.permissions: string[]
// Format: "{action}:{resource}" (lowercase)
['read:users', 'manage:roles', 'create:orders', 'read:audit-logs']
```

### CASL rules format (convenience)
```typescript
// Stored in user.rules: CaslRule[]
// Format: { action: string, subject: string }
[{ action:'read', subject:'Users' }, { action:'manage', subject:'Roles' }]
```

### Subject mapping
```
JWT resource (lowercase)    CASL subject (Capitalized)
──────────────────────────  ───────────────────────
users              →        Users
roles              →        Roles
audit-logs         →        AuditLogs
api-keys           →        ApiKeys
settings           →        Settings
...                →        ...
```

### Permission check functions

```typescript
// ── Tier 1: JWT-backed (trusted) ──
function parseJwtPermission(permissions: string[], subject: string): boolean {
  const resource = subject.charAt(0).toLowerCase() + subject.slice(1);  // 'Users' → 'users'
  return permissions.some(p =>
    p === `read:${resource}` ||
    p === `manage:${resource}` ||
    p === 'manage:all' ||
    p === 'read:all'
  );
}

// ── Tier 2: CASL-backed (convenience) ──
// usePermission('delete', 'Users') → uses ability.can('delete', 'Users')
// ⚠️ CAN be manipulated in DevTools — only affects UI toggles
```

---

## Task 1: Create JWT-backed admin module registry

**Objective:** Define admin modules and a hook that uses JWT `permissions` (trusted) — NOT CASL `rules` — to determine visibility. This is the security boundary: even if a hacker modifies `rules`, the module list stays accurate.

**Files:**
- Create: `apps/portal-web/src/lib/admin-modules.ts`

```typescript
import { useMemo } from 'react';
import { useAuthStore } from '@platform/hooks';
import type { LucideIcon } from 'lucide-react';
import {
  Users, Shield, Key, Activity, Package, ShoppingCart,
  FileText, Building, Flag, Clock, Link as LinkIcon,
  BellRing, HardDrive, Share2, FileCode, Settings,
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
// subject = Capitalized(first-char) of resource (for CASL compatibility).
// resource = lowercase (matches backend permission strings like 'read:users').

export const ADMIN_MODULES: AdminModule[] = [
  { id: 'users',           label: 'Users',           description: 'Manage user accounts',         href: '/users',          icon: Users,         action: 'read', resource: 'users' },
  { id: 'roles',           label: 'Roles',           description: 'Role & permission management', href: '/roles',          icon: Shield,        action: 'read', resource: 'roles' },
  { id: 'audit-logs',      label: 'Audit Logs',      description: 'System activity trail',        href: '/audit-logs',     icon: Activity,      action: 'read', resource: 'audit-logs' },
  { id: 'api-keys',        label: 'API Keys',        description: 'Manage API access keys',       href: '/api-keys',       icon: Key,           action: 'read', resource: 'api-keys' },
  { id: 'settings',        label: 'Settings',        description: 'System configuration',         href: '/settings',       icon: Settings,      action: 'read', resource: 'settings' },
  { id: 'products',        label: 'Products',        description: 'Product catalog',              href: '/products',       icon: Package,       action: 'read', resource: 'products' },
  { id: 'orders',          label: 'Orders',          description: 'Customer orders',              href: '/orders',         icon: ShoppingCart,  action: 'read', resource: 'orders' },
  { id: 'invoices',        label: 'Invoices',        description: 'Billing & invoices',           href: '/invoices',       icon: FileText,      action: 'read', resource: 'invoices' },
  { id: 'tenants',         label: 'Tenants',         description: 'Multi-tenant management',      href: '/tenants',        icon: Building,      action: 'read', resource: 'tenants' },
  { id: 'feature-flags',   label: 'Feature Flags',   description: 'Feature toggles',              href: '/feature-flags',  icon: Flag,          action: 'read', resource: 'feature-flags' },
  { id: 'scheduled-jobs',  label: 'Scheduled Jobs',  description: 'Cron job management',          href: '/scheduled-jobs', icon: Clock,         action: 'read', resource: 'scheduled-jobs' },
  { id: 'integrations',    label: 'Integrations',    description: 'Third-party integrations',     href: '/integrations',   icon: LinkIcon,      action: 'read', resource: 'integrations' },
  { id: 'webhooks',        label: 'Webhooks',        description: 'Webhook endpoints',            href: '/webhooks',       icon: FileCode,      action: 'read', resource: 'webhooks' },
  { id: 'notifications',   label: 'Notifications',   description: 'Notification templates',       href: '/notifications',  icon: BellRing,      action: 'read', resource: 'notifications' },
  { id: 'storage',         label: 'Storage',         description: 'File storage management',      href: '/storage',        icon: HardDrive,     action: 'read', resource: 'storage' },
  { id: 'workflows',       label: 'Workflows',       description: 'Workflow definitions',         href: '/workflows',      icon: Share2,        action: 'read', resource: 'workflows' },
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
export function getAccessibleModules(
  permissions: string[],
): AdminModule[] {
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
 *
 * Tier 2 (CASL rules) is still available separately for fine-grained UI
 * toggles via usePermission() — but admin MODULE visibility uses Tier 1.
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
```

**Step 1:** Write file to `apps/portal-web/src/lib/admin-modules.ts`

**Step 2:** Verify compilation:
Run: `npx tsc --noEmit --project apps/portal-web/tsconfig.json 2>&1 | head -20`
Expected: No errors

**Step 3:** Commit
```bash
git add apps/portal-web/src/lib/admin-modules.ts
git commit -m "feat(admin): add JWT-backed admin module registry (Tier 1 security)"
```

---

## Task 2: Create JWT-backed Admin Layout

**Objective:** Admin sidebar layout that uses `useAdminModules()` (JWT-backed) for nav items. Even if hacker modifies `rules`, the sidebar shows only modules their JWT permissions allow.

**Files:**
- Create: `apps/portal-web/src/layouts/admin-layout.tsx`

```tsx
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@platform/hooks';
import { NotificationBell } from '../components/notification-bell';
import { useAdminModules } from '../lib/admin-modules';
import { Menu, X, LayoutDashboard, LogOut } from 'lucide-react';

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  // ── JWT-backed module list (Tier 1) ──
  const { modules: visibleModules, hasAnyAccess } = useAdminModules();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            {user?.displayName?.charAt(0) ?? 'A'}
          </div>
          <span className="text-sm font-semibold">Admin Console</span>
        </div>

        {/* Navigation — JWT-backed */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>

          <div className="border-t my-2" />

          {visibleModules.length > 0 ? (
            visibleModules.map((m) => (
              <NavLink
                key={m.id}
                to={`/admin${m.href}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`
                }
              >
                <m.icon size={16} />
                {m.label}
              </NavLink>
            ))
          ) : (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              You don't have access to any admin modules.
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {user?.displayName?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 truncate">
              <p className="font-medium truncate">{user?.displayName ?? user?.username ?? 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-card px-4 shadow-sm">
          <button className="rounded-lg p-2 hover:bg-accent lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex-1" />
          <NotificationBell />
          <button
            className="rounded-lg p-2 hover:bg-accent transition-colors"
            onClick={() => navigate('/')}
            title="Switch to User Portal"
          >
            <LayoutDashboard size={16} />
          </button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

**Step 1:** Write file

**Step 2:** Verify: `npx tsc --noEmit --project apps/portal-web/tsconfig.json`

**Step 3:** Commit
```bash
git add apps/portal-web/src/layouts/admin-layout.tsx
git commit -m "feat(admin): add JWT-backed admin sidebar layout"
```

---

## Task 3: Create admin Dashboard page (JWT-backed)

**Objective:** Dashboard showing only modules the user's JWT permissions allow.

**Files:**
- Create: `apps/portal-web/src/pages/admin/dashboard.tsx`

```tsx
import { useNavigate } from 'react-router-dom';
import { useAdminModules } from '../../lib/admin-modules';
import { Card, CardContent, CardHeader, CardTitle } from '@platform/ui';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { modules: visibleModules, hasAnyAccess } = useAdminModules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {hasAnyAccess
            ? 'Management console — modules you have access to.'
            : "You don't have access to any admin modules."}
        </p>
      </div>

      {hasAnyAccess ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleModules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => navigate(`/admin${mod.href}`)}
              className="text-left"
            >
              <Card className="h-full transition-colors hover:bg-accent/50 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{mod.label}</CardTitle>
                  <mod.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You don't have permission to access any admin modules.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Contact your administrator to request access.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Step 1:** `mkdir -p apps/portal-web/src/pages/admin` then write file.

**Step 2:** Verify compilation.

**Step 3:** Commit
```bash
git add apps/portal-web/src/pages/admin/dashboard.tsx
git commit -m "feat(admin): add JWT-backed admin dashboard page"
```

---

## Task 4: Add admin routes to App.tsx

**Objective:** Add `/admin/*` route group. Admin section uses ProtectedRoute for auth, AdminLayout for chrome.

**Files:**
- Modify: `apps/portal-web/src/App.tsx`

**Changes:**
1. Import `AdminLayout` from `./layouts/admin-layout`
2. Lazy import `AdminDashboardPage`
3. Add route block after existing protected routes, before catch-all

```tsx
// === IMPORTS ===
import { AdminLayout } from './layouts/admin-layout';

// === LAZY PAGES ===
const AdminDashboardPage = lazy(() => import('./pages/admin/dashboard'));

// === ROUTES (inside RouterProvider) ===
// ... existing routes ...

// Add after the main Layout route group, before catch-all Route:
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<AdminDashboardPage />} />
</Route>

// Also add admin-branded login route alongside existing login:
// (modify login.tsx to accept a mode prop)
<Route path="/admin/login" element={<LoginPage adminMode />} />
```

**Rationale for not duplicating routes:** The existing portal pages (`/users`, `/roles`, etc.) are fully functional. Admin layout provides a different chrome (sidebar vs top-nav). The admin sidebar links directly to existing routes. No need for `/admin/users` → `/users` redirects.

**Step 1:** Read current App.tsx to find exact insertion lines:
Run: `cat apps/portal-web/src/App.tsx`

**Step 2-3:** Edit, verify, commit.

---

## Task 5: Add JWT-gated Admin entry in SiteHeader

**Objective:** Show "Admin" button in portal nav only when JWT permissions indicate admin access. Uses `useAdminModules()` which is JWT-backed.

**Files:**
- Modify: `apps/portal-web/src/components/site-header.tsx`

```tsx
// Import:
import { useAdminModules } from '../lib/admin-modules';
import { Shield } from 'lucide-react';

// Inside component:
const { hasAnyAccess } = useAdminModules();

// In desktop nav (after existing menuItems):
{hasAnyAccess && (
  <NavLink
    to="/admin"
    className={({ isActive }) =>
      `flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent ${
        isActive ? 'bg-accent text-primary font-medium' : ''
      }`
    }
  >
    <Shield size={16} />
    <span className="hidden lg:inline">Admin</span>
  </NavLink>
)}
```

**Step 1-3:** Edit, verify, commit.

---

## Task 6: Add admin-branded login route

**Objective:** `/admin/login` shows "Admin Console" branding.

**Files:**
- Modify: `apps/portal-web/src/pages/login.tsx`
- Modify: `apps/portal-web/src/App.tsx`

**Changes to `login.tsx`:**
```tsx
interface LoginPageProps {
  adminMode?: boolean;
}

export function LoginPage({ adminMode = false }: LoginPageProps) {
  // ... existing code ...
  // Change branding:
  <CardTitle className="text-xl">
    {adminMode ? 'Admin Console' : 'Platform Portal'}
  </CardTitle>
  // Change redirect target:
  navigate(adminMode ? '/admin' : '/', { replace: true });
}
```

**Changes to `App.tsx`:**
```tsx
<Route path="/admin/login" element={<LoginPage adminMode />} />
```

**Step 1-3:** Edit, verify, commit.

---

## Task 7: Remove admin-web app and all Docker/compose/docs references

**Objective:** Delete dead code.

**Files:**
- Delete: `apps/admin-web/` (entire dir)
- Delete: `docker/Dockerfile.admin-web`
- Delete: `docker/nginx/admin.conf`
- Modify: `docker/docker-compose.yml` — remove admin-web service + references
- Modify: `docker/docker-compose.prod.yml` — remove admin-web deploy
- Modify: `README.md`, `docs/adr/*` — remove references

**Step 1:**
```bash
rm -rf apps/admin-web docker/Dockerfile.admin-web docker/nginx/admin.conf
```

**Step 2:** Edit compose files, docs.

**Step 3:** Find and clean remaining refs:
```bash
grep -r "admin-web" docker/ docs/ README.md --include="*.yml" --include="*.md" 2>/dev/null
```

**Step 4:** Re-install:
```bash
pnpm install 2>&1 | tail -5
```

**Step 5:** Verify build:
```bash
cd apps/portal-web && npx vite build 2>&1 | tail -10
```

**Step 6:**
```bash
git add -A
git commit -m "chore: remove admin-web app, merged into portal-web"
```

---

## Task 8: Security verification

**Objective:** Prove that tampering with CASL rules in DevTools cannot reveal hidden admin modules.

**Step 1:** Login as user with `read:users` only (no `read:roles`).

**Step 2:** In DevTools Console:
```javascript
// Try to add fake rules
const store = /* find zustand store */;
store.setState({ user: { ...store.getState().user, rules: [
  { action: 'read', subject: 'Users' },
  { action: 'read', subject: 'Roles' },        // fake!
  { action: 'manage', subject: 'AuditLogs' }   // fake!
]}});
```

**Step 3:** Observe that Admin sidebar STILL shows only "Users" module — because module list comes from JWT `permissions`, not from `rules`.

**Step 4:** Navigate to `/admin/roles` in URL bar. Observe that:
- Page loads (no route guard blocks it — Phase 2 could add route guards)
- The actual API call to `/api/v1/roles` fails with 403
- Backend PermissionsGuard catches it: `user.permissions` (from JWT) doesn't include `read:roles` → ForbiddenException

**Step 5:** Verify `hasAdminAccess` function:
```bash
cd apps/portal-web && npx jest src/lib/admin-modules.test.ts --watchAll=false
```

Write a test:
```typescript
// src/lib/admin-modules.test.ts
import { getAccessibleModules, hasAnyAdminAccess } from './admin-modules';

describe('getAccessibleModules', () => {
  it('returns empty for user with no permissions', () => {
    expect(getAccessibleModules([])).toHaveLength(0);
  });

  it('returns Users module when user has read:users', () => {
    const modules = getAccessibleModules(['read:users']);
    expect(modules).toHaveLength(1);
    expect(modules[0].id).toBe('users');
  });

  it('handles manage:all as super admin', () => {
    expect(getAccessibleModules(['manage:all'])).toHaveLength(16);
  });

  it('handles manage:resource as implied read:resource', () => {
    const modules = getAccessibleModules(['manage:roles']);
    expect(modules).toHaveLength(1);
    expect(modules[0].id).toBe('roles');
  });
});

describe('hasAnyAdminAccess', () => {
  it('returns false for empty permissions', () => {
    expect(hasAnyAdminAccess([])).toBe(false);
  });

  it('returns false for non-admin permissions', () => {
    expect(hasAnyAdminAccess(['read:profile', 'update:profile'])).toBe(false);
  });

  it('returns true for any admin resource access', () => {
    expect(hasAnyAdminAccess(['read:users'])).toBe(true);
    expect(hasAnyAdminAccess(['manage:roles'])).toBe(true);
    expect(hasAnyAdminAccess(['read:all'])).toBe(true);
  });
});
```

**Step 6:** Run lint:
```bash
pnpm lint 2>&1 | tail -10
```

---

## Security model summary

```
JWT permissions ['read:users', ...]  (SIGNED — immutable)
         │
         ├─→ Admin module list (Tier 1)     ← IMMUTABLE
         │      ↓                           ← Hacker CANNOT fake
         │   Sidebar, dashboard, Admin entry
         │
         ├─→ PermissionsGuard (backend)
         │      ↓
         │   API access (403 if missing)    ← IMMUTABLE
         │
         └─→ CASL rules from /auth/me       (API RESPONSE — mutable)
                  ↓
               usePermission('delete', 'Users')
                  ↓
               UI buttons, forms             ← MUTABLE (SAFE)
                                              Hacker CAN fake, but backend
                                              enforces real permissions
```

**What a hacker CAN do by modifying `rules` in DevTools:**
- See a "Delete" button that calls a 403 endpoint
- Navigate to a route whose API calls fail
- Waste their own time

**What a hacker CANNOT do by modifying `rules`:**
- See admin modules they lack JWT permissions for
- Call APIs they lack JWT permissions for (backend `PermissionsGuard` enforces)
- Access any data or perform any action beyond their real permissions

---

## Summary of all file changes

| Action | File | Security tier |
|--------|------|---------------|
| **Create** | `apps/portal-web/src/lib/admin-modules.ts` | **Tier 1 (JWT)** — module registry + testable helpers |
| **Create** | `apps/portal-web/src/layouts/admin-layout.tsx` | Tier 1 — sidebar rendered from JWT-backed hook |
| **Create** | `apps/portal-web/src/pages/admin/dashboard.tsx` | Tier 1 — cards from JWT-backed hook |
| **Modify** | `apps/portal-web/src/App.tsx` | Routes with ProtectedRoute |
| **Modify** | `apps/portal-web/src/components/site-header.tsx` | Tier 1 — Admin button gated by JWT permissions |
| **Modify** | `apps/portal-web/src/pages/login.tsx` | adminMode prop |
| **Create** | `apps/portal-web/src/lib/admin-modules.test.ts` | Unit tests for security helpers |
| **Delete** | `apps/admin-web/` | — |
| **Delete** | `docker/Dockerfile.admin-web` | — |
| **Delete** | `docker/nginx/admin.conf` | — |
| **Modify** | `docker/docker-compose.yml` | Remove admin-web service |
| **Modify** | `docker/docker-compose.prod.yml` | Remove admin-web deploy |

---

## Risks

1. **Permission string format drift:** Admin module registry uses lowercase resource names (`'users'`, `'audit-logs'`) to match JWT permission strings. If backend changes naming convention (e.g., `'user:read'` instead of `'read:users'`), the checks break. **Mitigation:** Centralize in one file with a test that validates against a mock backend response.

2. **JWT permission format ≠ CASL subject format:** JWT uses `read:users` (lowercase, colon), CASL uses `usePermission('read', 'Users')` (Capitalized). The `admin-modules.ts` helper converts: `resource` → lowercase for JWT, subject → Capitalized for CASL. Documented in the registry.

3. **Route-level vs data-level security:** Phase 1 does NOT add route guards — a user can navigate to `/admin/roles` in the URL even without permission. The page loads but API calls fail. Phase 2 could add a route guard that checks JWT permissions before rendering the page.

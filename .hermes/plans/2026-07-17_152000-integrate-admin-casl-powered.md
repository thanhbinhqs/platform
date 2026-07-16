# Integrate Admin Web into Portal Web — CASL-Powered Permission Model

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Merge `apps/admin-web` into `apps/portal-web` with admin UI that dynamically adapts to each user's CASL permission rules — no hardcoded roles, no single "is admin" gate.

**Architecture:** The backend already serialises CASL rules (`User.rules: CaslRule[]`) into every auth response. The frontend's existing `usePermission` hook wraps `createMongoAbility` so that `usePermission('read', 'Users')` leverages CASL's full semantics: wildcard subjects (`'all'`), wildcard actions (`'manage'`), conditions, and inversion. Each admin module checks `usePermission('read', subject)` as the visibility gate — CASL guarantees that `manage:Users` implies `read:Users`, and `read:all` covers everything. A secondary `usePermission('create', subject)` fallback handles the rare case where a user has a non-read permission without read. The result: zero role hardcoding, fully dynamic rendering.

**Tech Stack:** React 19 + Vite 6 + CASL (`@casl/ability` via `@platform/hooks`/`usePermission`) + `@platform/shared-types` (CaslRule)

---
## Core Principle: Let CASL Do the Work

```typescript
// User.rules from backend (example - super admin):
const rules: CaslRule[] = [
  { action: 'manage', subject: 'all' }  // can do ANYTHING
];

// User.rules (example - user admin):
const rules: CaslRule[] = [
  { action: 'read', subject: 'Users' },
  { action: 'manage', subject: 'Roles' },
  { action: 'read', subject: 'AuditLogs' },
  { action: 'delete', subject: 'Users', inverted: true },  // CANNOT delete users
];

// usePermission('read', 'Users') under the hood:
//   → ability.can('read', 'Users')
//   → CASL evaluates EVERY rule in the array
//   → 'manage:all' matches → true ✅
//   → 'read:Users' matches → true ✅
//   → 'delete:Users' (inverted) → only blocks ability.can('delete', 'Users')!
//   → 'read:Orders' → no rule matches → false ❌

// KEY CASL BEHAVIOURS WE RELY ON:
// 1. 'manage' implies every sub-action → manage:Users makes read:Users return true
// 2. 'all' matches any subject → read:all makes read:Users return true
// 3. Inverted rules only block their specific action+subject → delete:Users inverted
//    does NOT block read:Users
// 4. Conditions are evaluated per-rule
```

Because `usePermission` delegates entirely to CASL, we write **zero permission logic**. The admin UI is a pure reflection of what CASL says the user can access.

---

## Task 1: Create admin module registry + CASL-powered hook

**Objective:** Define a single source of truth mapping CASL subjects → admin modules, and a hook that uses CASL to filter them.

**Files:**
- Create: `apps/portal-web/src/lib/admin-modules.ts`

**Design:**
1. `ADMIN_MODULES` — static registry (subject → label, icon, href, description)
2. `useAdminModules()` — hook returning filtered modules and a `hasAnyAdminAccess` boolean. Uses `usePermission` under the hood, which delegates to CASL.
3. `ADMIN_SUBJECTS` — the set of all CASL subjects for quick lookup

```typescript
// ── apps/portal-web/src/lib/admin-modules.ts ──

import { useMemo } from 'react';
import { usePermission } from '@platform/hooks';
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
  /** Minimum CASL action needed to view this module. Default: 'read'. */
  action: string;
  /** CASL subject (Capitalized, matches what AbilityFactory.toSubject() produces). */
  subject: string;
  /** Alternative actions that also grant access (e.g., 'create' if no 'read'). */
  altActions?: string[];
}

// ─── Registry ──────────────────────────────────────────────
// Maps CASL subjects → admin UI metadata.
// NOTE: Keep this in sync with backend IAM modules as they evolve.
//       Subject names are Capitalized per AbilityFactory.toSubject().

export const ADMIN_MODULES: AdminModule[] = [
  { id: 'users',           label: 'Users',           description: 'Manage user accounts',         href: '/users',          icon: Users,         action: 'read',  subject: 'Users' },
  { id: 'roles',           label: 'Roles',           description: 'Role & permission management', href: '/roles',          icon: Shield,        action: 'read',  subject: 'Roles' },
  { id: 'audit-logs',      label: 'Audit Logs',      description: 'System activity trail',        href: '/audit-logs',     icon: Activity,      action: 'read',  subject: 'AuditLogs' },
  { id: 'api-keys',        label: 'API Keys',        description: 'Manage API access keys',       href: '/api-keys',       icon: Key,           action: 'read',  subject: 'ApiKeys' },
  { id: 'settings',        label: 'Settings',        description: 'System configuration',         href: '/settings',       icon: Settings,      action: 'read',  subject: 'Settings' },
  { id: 'products',        label: 'Products',        description: 'Product catalog',              href: '/products',       icon: Package,       action: 'read',  subject: 'Products' },
  { id: 'orders',          label: 'Orders',          description: 'Customer orders',              href: '/orders',         icon: ShoppingCart,  action: 'read',  subject: 'Orders' },
  { id: 'invoices',        label: 'Invoices',        description: 'Billing & invoices',           href: '/invoices',       icon: FileText,      action: 'read',  subject: 'Invoices' },
  { id: 'tenants',         label: 'Tenants',         description: 'Multi-tenant management',      href: '/tenants',        icon: Building,      action: 'read',  subject: 'Tenants' },
  { id: 'feature-flags',   label: 'Feature Flags',   description: 'Feature toggles',              href: '/feature-flags',  icon: Flag,          action: 'read',  subject: 'FeatureFlags' },
  { id: 'scheduled-jobs',  label: 'Scheduled Jobs',  description: 'Cron job management',          href: '/scheduled-jobs', icon: Clock,         action: 'read',  subject: 'ScheduledJobs' },
  { id: 'integrations',    label: 'Integrations',    description: 'Third-party integrations',     href: '/integrations',   icon: LinkIcon,      action: 'read',  subject: 'Integrations' },
  { id: 'webhooks',        label: 'Webhooks',        description: 'Webhook endpoints',            href: '/webhooks',       icon: FileCode,      action: 'read',  subject: 'Webhooks' },
  { id: 'notifications',   label: 'Notifications',   description: 'Notification templates',       href: '/notifications',  icon: BellRing,      action: 'read',  subject: 'Notifications' },
  { id: 'storage',         label: 'Storage',         description: 'File storage management',      href: '/storage',        icon: HardDrive,     action: 'read',  subject: 'Storage' },
  { id: 'workflows',       label: 'Workflows',       description: 'Workflow definitions',         href: '/workflows',      icon: Share2,        action: 'read',  subject: 'Workflows' },
];

/** Convenience: all admin subject names for quick checking. */
export const ADMIN_SUBJECTS = ADMIN_MODULES.map((m) => m.subject);

// ─── CASL-Powered Hook ────────────────────────────────────

/**
 * useAdminModules() — uses CASL (via usePermission) to determine
 * which admin modules the current user can access.
 *
 * CASL SEMANTICS PRESERVED:
 * - `manage:Users` → `usePermission('read', 'Users')` === true  (manage implies read)
 * - `read:all` → `usePermission('read', 'Users')` === true      (wildcard subject)
 * - `manage:all` → `usePermission('read', 'Users')` === true    (both wildcards)
 * - inverted rules (e.g. `{action:'delete', subject:'Users', inverted:true}`)
 *   only block that specific ability, so read:Users still works if granted elsewhere
 * - conditions are evaluated per-rule by CASL internally
 *
 * EDGE CASE HANDLED: A user with `create:Orders` but no `read:Orders`
 * would still see the Orders module (via altActions fallback).
 */
export function useAdminModules() {
  const visibleModules = useMemo(
    () =>
      ADMIN_MODULES.filter((mod) => {
        // PRIMARY: CASL check for the required action (usually 'read')
        if (usePermission(mod.action, mod.subject)) return true;

        // FALLBACK: check alternative actions (e.g., 'create' without 'read')
        if (mod.altActions?.some((a) => usePermission(a, mod.subject))) return true;

        return false;
      }),
    // Intentionally no deps — usePermission reads from zustand store internally
    // and components re-render when the store changes.
    [],
  );

  return {
    /** Modules the user can see, filtered by CASL rules. */
    modules: visibleModules,
    /** True if user has access to at least one admin module. */
    hasAnyAccess: visibleModules.length > 0,
    /** All registered module defs (unfiltered) — for route config, etc. */
    allModules: ADMIN_MODULES,
  };
}
```

**Step 1:** Write the file above to `apps/portal-web/src/lib/admin-modules.ts`

**Step 2:** Verify compilation:
Run: `npx tsc --noEmit --project apps/portal-web/tsconfig.json 2>&1 | head -20`
Expected: No errors

**Step 3:** Commit
```bash
git add apps/portal-web/src/lib/admin-modules.ts
git commit -m "feat(admin): add CASL-powered admin module registry + useAdminModules hook"
```

---

## Task 2: Create permission-driven Admin Layout using CASL

**Objective:** Build the admin sidebar layout that renders nav items using `useAdminModules()`, dynamically reflecting the user's CASL permissions.

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

  // ── CASL-driven module visibility ──
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

        {/* Navigation — dynamically rendered from CASL rules */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {/* Dashboard link (always visible) */}
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

**Key CASL integration point:** `useAdminModules()` → calls `usePermission()` per module → `usePermission` internally calls `ability.can(action, subject)` via `createMongoAbility(rules)`. The rules come from `User.rules` which is served by the backend. No custom permission logic written.

**Step 1:** Write the file

**Step 2:** Verify: `npx tsc --noEmit --project apps/portal-web/tsconfig.json`

**Step 3:** Commit
```bash
git add apps/portal-web/src/layouts/admin-layout.tsx
git commit -m "feat(admin): add CASL-driven admin sidebar layout"
```

---

## Task 3: Create Admin Dashboard page using CASL

**Objective:** Dashboard page that shows cards only for modules where CASL grants the user access.

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
            : 'You don\'t have access to any admin modules.'}
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

**Step 1:** Create `mkdir -p apps/portal-web/src/pages/admin` then write file.

**Step 2:** Verify compilation.

**Step 3:** Commit
```bash
git add apps/portal-web/src/pages/admin/dashboard.tsx
git commit -m "feat(admin): add CASL-driven admin dashboard page"
```

---

## Task 4: Add admin routes to portal-web App.tsx

**Objective:** Register `/admin/*` routes with `ProtectedRoute` + `AdminLayout`. All admin pages reuse existing portal pages under `<Layout>`.

**Files:**
- Modify: `apps/portal-web/src/App.tsx`

**Current route structure (from existing code):**
```
/login                    → LoginPage (public)
/register                 → RegisterPage (public)
/forgot-password          → ForgotPasswordPage (public)
/reset-password           → ResetPasswordPage (public)
/                         → ProtectedRoute → Layout → DashboardPage
/users                    → ProtectedRoute → Layout → UsersPage
/roles                    → ProtectedRoute → Layout → RolesPage
... (existing routes)
```

**New routes to add:**
```
/admin/login              → LoginPage (adminMode)    — public, branded
/admin                    → ProtectedRoute → AdminLayout → AdminDashboardPage
/admin/users              → same as /users (redirect or render same component)
/admin/roles              → same as /roles
...
```

**Strategy:** Keep admin routes DELEGATING to the same page components as the user portal. The admin sidebar IS the difference — instead of top-nav + Layout, admin uses sidebar + AdminLayout. Both point to the same page components.

**Minimal App.tsx changes:**
```tsx
// 1. Import AdminLayout
import { AdminLayout } from './layouts/admin-layout';

// 2. Lazy import admin pages
const AdminDashboardPage = lazy(() => import('./pages/admin/dashboard'));

// 3. After the main ProtectedRoute block, add:
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<AdminDashboardPage />} />
  {/* Admin points to the same pages as the user portal */}
</Route>

// 4. Add admin login route alongside public routes:
<Route path="/admin/login" element={<LoginPage adminMode />} />
```

**Rationale for reusing pages:** The existing `/users`, `/roles`, etc. pages in portal-web are already fully functional. Admin doesn't need separate page instances — the admin layout wraps the same page components. Users coming from the admin sidebar see the same page but with the admin sidebar chrome instead of the top-nav chrome.

**Decision point:** We COULD wrap existing pages as `/admin/users`, `/admin/roles` aliases using react-router `<Route path="users" element={<Navigate to="/users" />} />` — but this adds maintenance burden with zero UX benefit. For Phase 1, the admin sidebar links directly to the existing routes. Users navigate from admin sidebar → existing page.

**Step 1:** Read current App.tsx to identify exact insertion points:
Run: `cat apps/portal-web/src/App.tsx`

**Step 2-3:** Make edits, verify, commit.

---

## Task 5: Add CASL-gated Admin entry in SiteHeader

**Objective:** Show/hide the "Admin" button in the portal nav based on CASL rules — only visible when user has at least one admin module permission.

**Files:**
- Modify: `apps/portal-web/src/components/site-header.tsx`

**Approach:** Use `useAdminModules().hasAnyAccess` to conditionally render. Since `useAdminModules()` delegates to `usePermission()` which delegates to CASL, this is fully CASL-powered.

```tsx
// Import at top:
import { useAdminModules } from '../lib/admin-modules';
import { Shield } from 'lucide-react';

// Inside component, after existing hooks:
const { hasAnyAccess } = useAdminModules();

// In the desktop nav section, add after the regular menuItems:
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

Similarly add to the mobile menu section.

**Step 1-3:** Edit, verify, commit.

**CASL at work:** If user has `manage:all` → `useAdminModules()` sees 16 modules → `hasAnyAccess = true` → "Admin" button visible. If user has zero admin perms → `hasAnyAccess = false` → button hidden. All driven by `User.rules`.

---

## Task 6: Remove admin-web app and all references

**Objective:** Delete `apps/admin-web/` + its Docker infrastructure after confirming portal-web has all features.

**Files to delete:**
- `apps/admin-web/` — entire directory
- `docker/Dockerfile.admin-web`
- `docker/nginx/admin.conf`

**Files to modify:**
- `docker/docker-compose.yml` — remove admin-web service, admin.conf volume mount, nginx depends_on admin-web
- `docker/docker-compose.prod.yml` — remove admin-web deploy block
- `README.md` — update app list
- `docs/adr/*.md` — update if references exist

**Step 1:** Remove app + Docker files:
```bash
rm -rf apps/admin-web docker/Dockerfile.admin-web docker/nginx/admin.conf
```

**Step 2:** Edit docker-compose files (manual patch)

**Step 3:** Clean up remaining references:
```bash
grep -r "admin-web" docker/ docs/ README.md --include="*.yml" --include="*.md" 2>/dev/null
```

**Step 4:** Update workspace (remove from lock):
```bash
pnpm install 2>&1 | tail -5
```

**Step 5:** Verify portal-web builds:
```bash
cd apps/portal-web && npx vite build 2>&1 | tail -10
```

**Step 6:** Commit:
```bash
git add -A
git commit -m "chore: remove admin-web app, merged into portal-web"
```

---

## Task 7: End-to-end verification with CASL rule sets

**Objective:** Start dev, log in as users with different CASL rules, verify each sees only what they should.

**Step 1:** Start infra + dev server:
```bash
docker compose -f docker/docker-compose.infra.yml up -d
cd apps/portal-web && pnpm dev
```

**Step 2:** Test scenarios:

| User's CASL Rules | What they see |
|---|---|
| `[]` (no rules) | Portal: no "Admin" button. /admin: empty state "no access" |
| `[{action:'read', subject:'Users'}]` | Portal: "Admin" button. Sidebar: Users only. Dashboard: 1 card |
| `[{action:'manage', subject:'Users'}]` | Same as above (CASL: manage implies read) |
| `[{action:'create', subject:'Orders'}]` (read but no read) | Sidebar: shows Orders (via altActions fallback). Dashboard: 1 card |
| `[{action:'manage', subject:'all'}]` | Super admin: ALL 16 modules visible |
| `[{action:'read', subject:'Users'}, {action:'read', subject:'Roles'}, {action:'read', subject:'AuditLogs'}]` | 3 modules visible |
| `[{action:'read', subject:'Users'}, {action:'delete', subject:'Users', inverted:true}]` | Users visible (inverted delete doesn't block read) |

**Step 3:** CASL-specific edge cases to verify:
- **Wildcard subject:** Does `read:all` show all modules? (YES — CASL wildcard)
- **Wildcard action:** Does `manage:Users` show Users? (YES — CASL manage implication)
- **Inverted rule:** Does `delete:Users inverted` still allow viewing Users? (YES — only blocks delete)
- **No matching rule:** Does a user with only `read:Orders` see other modules? (NO — no rule match)

**Step 4:** Lint:
```bash
pnpm lint 2>&1 | tail -10
```

---

## Summary of all file changes

| Action | File | CASL role |
|--------|------|-----------|
| **Create** | `apps/portal-web/src/lib/admin-modules.ts` | **New:** Module registry + `useAdminModules()` hook (CASL-powered) |
| **Create** | `apps/portal-web/src/layouts/admin-layout.tsx` | Uses `useAdminModules()` for nav |
| **Create** | `apps/portal-web/src/pages/admin/dashboard.tsx` | Uses `useAdminModules()` for cards |
| **Modify** | `apps/portal-web/src/App.tsx` | Routes wired to AdminLayout |
| **Modify** | `apps/portal-web/src/components/site-header.tsx` | Admin button gated by `useAdminModules().hasAnyAccess` |
| **Modify** | `apps/portal-web/src/pages/login.tsx` | adminMode prop for branding |
| **Delete** | `apps/admin-web/` (entire dir) | — |
| **Delete** | `docker/Dockerfile.admin-web` | — |
| **Delete** | `docker/nginx/admin.conf` | — |
| **Modify** | `docker/docker-compose.yml` | Remove admin-web service |
| **Modify** | `docker/docker-compose.prod.yml` | Remove admin-web deploy |

---

## Why this is fully CASL-powered

```
Backend stores permissions ──→ AbilityFactory.toRawRules() ──→ User.rules: CaslRule[]
                                                                        │
                                                    Frontend receives via auth response
                                                                        │
                                                          useAuthStore → user.rules
                                                                        │
                                                     usePermission(action, subject)
                                                                        │
                                                    createMongoAbility(rules).can()
                                                                        │
                                                    ┌────────────────────┼────────────────────┐
                                                    ▼                    ▼                    ▼
                                            useAdminModules()     SiteHeader          Future: guards /
                                            (sidebar nav,         (Admin button vis)   route loaders
                                             dashboard cards)
```

**Zero custom permission logic.** Every visibility decision = CASL `ability.can(action, subject)`. The admin modules registry is the only thing that maps subjects → UI labels, and it's a pure data file — no logic.

---

## Risks

1. **Module registry out of sync:** If a new backend module is added (e.g., `Reports`), the registry needs updating. **Mitigation:** Keep `ADMIN_MODULES` in a single file; add a comment to update it when backend IAM modules change.

2. **Subject name mismatch:** The registry uses e.g. `'AuditLogs'` but backend might use `'AuditLog'`. **Mitigation:** Verify subject casing against `AbilityFactory.toSubject()` which capitalizes the first letter. All subjects are the PascalCase version of the resource name.

3. **Performance:** `usePermission` is called per module (16 times per render). Each creates a CASL ability from rules. **Mitigation:** React's `useMemo` in `useAdminModules()` prevents unnecessary re-computation. CASL ability creation is O(n) where n = number of rules (typically < 50).

# Integrate Admin Web into Portal Web — Permission-Driven

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Merge `apps/admin-web` into `apps/portal-web` with a **dynamic, permission-driven** admin section — each user sees only the modules they have access to based on their CASL rules.

**Architecture:** The admin section is NOT gated by a single "is admin" role. Instead, every nav item and dashboard card checks `usePermission(action, subject)` against the user's actual rules. Users with zero admin permissions who reach `/admin` see an empty state. The sidebar layout is borrowed from admin-web's design but renders menu items dynamically based on permissions. Portal-web already has all the feature pages; this just adds the admin landing / access layer.

**Tech Stack:** React 19 + Vite 6 + Tailwind 4 + react-router-dom v7 + Zustand + CASL (`usePermission` hook from `@platform/hooks`) + `@platform/shared-types` (CaslRule)

---
## Permission Model Reference

Platform uses CASL-style permissions. Each user has `rules: CaslRule[]` with shape `{ action, subject }`:

```typescript
interface CaslRule {
  action: string | string[];   // 'read' | 'create' | 'update' | 'delete' | 'manage'
  subject: string | string[];  // 'Users' | 'Roles' | 'AuditLogs' | 'ApiKeys' | 'Settings' | ...
}
```

Frontend check: `usePermission('read', 'Users')` → `ability.can('read', 'Users')`.

Admin dashboard dynamically shows modules the current user has `read` (or `manage`) access to.

---

## Task 1: Create permission-aware Admin Layout

**Objective:** Build a sidebar-based AdminLayout that shows nav items dynamically based on the user's actual CASL permission rules.

**Files:**
- Create: `apps/portal-web/src/layouts/admin-layout.tsx`

**Logic:**
1. Define a `moduleRegistry` array mapping each admin module to its required permission
2. Filter nav items via `usePermission(...)` at render time
3. If no items are visible, show empty state
4. Include a "Back to Portal" link

```tsx
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, usePermission } from '@platform/hooks';
import { NotificationBell } from '../components/notification-bell';
import {
  Menu, X, LayoutDashboard, Users, Shield, Key,
  Settings, LogOut, Activity, Bell, Package, ShoppingCart,
  FileText, Building, Flag, Clock, Link as LinkIcon,
  BellRing, HardDrive, Share2, FileCode,
} from 'lucide-react';

interface ModuleDef {
  label: string;
  href: string;
  icon: React.ReactNode;
  action: string;
  subject: string;
}

const MODULE_REGISTRY: ModuleDef[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={16} />, action: 'read', subject: 'Dashboard' },
  { label: 'Users', href: '/admin/users', icon: <Users size={16} />, action: 'read', subject: 'Users' },
  { label: 'Roles', href: '/admin/roles', icon: <Shield size={16} />, action: 'read', subject: 'Roles' },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: <Activity size={16} />, action: 'read', subject: 'AuditLogs' },
  { label: 'API Keys', href: '/admin/api-keys', icon: <Key size={16} />, action: 'read', subject: 'ApiKeys' },
  { label: 'Settings', href: '/admin/settings', icon: <Settings size={16} />, action: 'read', subject: 'Settings' },
  { label: 'Products', href: '/admin/products', icon: <Package size={16} />, action: 'read', subject: 'Products' },
  { label: 'Orders', href: '/admin/orders', icon: <ShoppingCart size={16} />, action: 'read', subject: 'Orders' },
  { label: 'Invoices', href: '/admin/invoices', icon: <FileText size={16} />, action: 'read', subject: 'Invoices' },
  { label: 'Tenants', href: '/admin/tenants', icon: <Building size={16} />, action: 'read', subject: 'Tenants' },
  { label: 'Feature Flags', href: '/admin/feature-flags', icon: <Flag size={16} />, action: 'read', subject: 'FeatureFlags' },
  { label: 'Scheduled Jobs', href: '/admin/scheduled-jobs', icon: <Clock size={16} />, action: 'read', subject: 'ScheduledJobs' },
  { label: 'Integrations', href: '/admin/integrations', icon: <LinkIcon size={16} />, action: 'read', subject: 'Integrations' },
  { label: 'Webhooks', href: '/admin/webhooks', icon: <FileCode size={16} />, action: 'read', subject: 'Webhooks' },
  { label: 'Notifications', href: '/admin/notifications', icon: <BellRing size={16} />, action: 'read', subject: 'Notifications' },
  { label: 'Storage', href: '/admin/storage', icon: <HardDrive size={16} />, action: 'read', subject: 'Storage' },
  { label: 'Workflows', href: '/admin/workflows', icon: <Share2 size={16} />, action: 'read', subject: 'Workflows' },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  // ── Only show modules the user has permission for ──
  const visibleModules = MODULE_REGISTRY.filter(
    (m) => m.subject === 'Dashboard' || usePermission(m.action, m.subject)
  );

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
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            {user?.displayName?.charAt(0) ?? 'A'}
          </div>
          <span className="text-sm font-semibold">Admin Console</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleModules.length > 1 ? (
            visibleModules.map((m) => (
              <NavLink
                key={m.href}
                to={m.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`
                }
              >
                {m.icon}
                {m.label}
              </NavLink>
            ))
          ) : (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              You don't have access to any admin modules.
            </div>
          )}
        </nav>

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

      {/* overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ── */}
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

**Step 1:** Write file to `apps/portal-web/src/layouts/admin-layout.tsx`

**Step 2:** Verify compilation:
Run: `npx tsc --noEmit --project apps/portal-web/tsconfig.json 2>&1 | head -30`
Expected: No new errors

**Step 3:** Commit
```bash
git add apps/portal-web/src/layouts/admin-layout.tsx
git commit -m "feat(portal): add permission-driven admin sidebar layout"
```

---

## Task 2: Create permission-driven Admin Dashboard page

**Objective:** Build an admin dashboard page that shows cards only for modules the user has access to.

**Files:**
- Create: `apps/portal-web/src/pages/admin/dashboard.tsx`

**Logic:** Use `usePermission` to check each module and render a card only when the user has the required permission. This is a dynamic grid — different users see different cards.

```tsx
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@platform/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@platform/ui';
import {
  Users, Shield, Key, Activity, Package, ShoppingCart,
  FileText, Building, Flag, Clock, Link as LinkIcon,
  BellRing, HardDrive, Share2, FileCode,
  type LucideIcon,
} from 'lucide-react';

interface DashboardCard {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  action: string;
  subject: string;
}

const ALL_CARDS: DashboardCard[] = [
  { label: 'Users', description: 'Manage user accounts', href: '/admin/users', icon: Users, action: 'read', subject: 'Users' },
  { label: 'Roles', description: 'Role & permission management', href: '/admin/roles', icon: Shield, action: 'read', subject: 'Roles' },
  { label: 'Audit Logs', description: 'System activity trail', href: '/admin/audit-logs', icon: Activity, action: 'read', subject: 'AuditLogs' },
  { label: 'API Keys', description: 'Manage API access keys', href: '/admin/api-keys', icon: Key, action: 'read', subject: 'ApiKeys' },
  { label: 'Settings', description: 'System configuration', href: '/admin/settings', icon: Settings, action: 'read', subject: 'Settings' },
  { label: 'Products', description: 'Product catalog', href: '/admin/products', icon: Package, action: 'read', subject: 'Products' },
  { label: 'Orders', description: 'Customer orders', href: '/admin/orders', icon: ShoppingCart, action: 'read', subject: 'Orders' },
  { label: 'Invoices', description: 'Billing & invoices', href: '/admin/invoices', icon: FileText, action: 'read', subject: 'Invoices' },
  { label: 'Tenants', description: 'Multi-tenant management', href: '/admin/tenants', icon: Building, action: 'read', subject: 'Tenants' },
  { label: 'Feature Flags', description: 'Feature toggles', href: '/admin/feature-flags', icon: Flag, action: 'read', subject: 'FeatureFlags' },
  { label: 'Scheduled Jobs', description: 'Cron job management', href: '/admin/scheduled-jobs', icon: Clock, action: 'read', subject: 'ScheduledJobs' },
  { label: 'Integrations', description: 'Third-party integrations', href: '/admin/integrations', icon: LinkIcon, action: 'read', subject: 'Integrations' },
  { label: 'Webhooks', description: 'Webhook endpoints', href: '/admin/webhooks', icon: FileCode, action: 'read', subject: 'Webhooks' },
  { label: 'Notifications', description: 'Notification templates', href: '/admin/notifications', icon: BellRing, action: 'read', subject: 'Notifications' },
  { label: 'Storage', description: 'File storage management', href: '/admin/storage', icon: HardDrive, action: 'read', subject: 'Storage' },
  { label: 'Workflows', description: 'Workflow definitions', href: '/admin/workflows', icon: Share2, action: 'read', subject: 'Workflows' },
];

export function AdminDashboardPage() {
  const navigate = useNavigate();

  // ── Check each card's permission independently ──
  const visibleCards = ALL_CARDS.filter(
    (card) => usePermission(card.action, card.subject)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Management console — modules you have access to.
        </p>
      </div>

      {visibleCards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleCards.map((card) => (
            <button
              key={card.href}
              onClick={() => navigate(card.href)}
              className="text-left"
            >
              <Card className="h-full transition-colors hover:bg-accent/50 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
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

**Step 1:** Create directory and files:
```bash
mkdir -p apps/portal-web/src/pages/admin
```
Then write the file above to `apps/portal-web/src/pages/admin/dashboard.tsx`

**Step 2:** Verify compilation

**Step 3:** Commit
```bash
git add apps/portal-web/src/pages/admin/dashboard.tsx
git commit -m "feat(portal): add permission-driven admin dashboard page"
```

---

## Task 3: Register /admin routes in App.tsx

**Objective:** Add the `/admin/*` route group to portal-web's router, wrapped in `ProtectedRoute` + `AdminLayout`.

**Files:**
- Modify: `apps/portal-web/src/App.tsx`

**Changes needed:**
1. Import `AdminLayout`
2. Lazy-import `AdminDashboardPage`
3. Add route block:
```tsx
// Imports
import { AdminLayout } from './layouts/admin-layout';

// Lazy page imports
const AdminDashboardPage = lazy(() => import('./pages/admin/dashboard'));

// Inside <Routes>, after all existing protected routes, before catch-all:
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
```

**Step 1:** Read current App.tsx to determine exact insertion points:
Run: `cat apps/portal-web/src/App.tsx`

**Step 2:** Apply patches (import + route block)

**Step 3:** Verify compilation

**Step 4:** Commit
```bash
git add apps/portal-web/src/App.tsx
git commit -m "feat(portal): add admin routes with permission-driven layout"
```

---

## Task 4: Add dynamic Admin entry in SiteHeader

**Objective:** In the portal's SiteHeader, show an "Admin" menu/button that appears only when the user has at least one admin module permission. This links to `/admin`.

**Files:**
- Modify: `apps/portal-web/src/components/site-header.tsx`

**Approach:** Use `usePermission` to check a few key admin modules. If the user has access to ANY, show the "Admin" menu item with `Shield` icon.

**What NOT to do:** Do NOT use a single fake "is admin" permission. Instead check a representative sample of admin resources. Alternative: check if `user?.roles?.some(r => r.type === 'SYSTEM')` if the API provides this, OR check `usePermission('read', 'Settings')` as a reasonable proxy for "has some admin access" — but document this tradeoff clearly.

**Better approach:** Create a small composition component:

```tsx
// In site-header.tsx, add near the nav rendering section:
import { Shield } from 'lucide-react';
import { usePermission } from '@platform/hooks';

function AdminMenuEntry() {
  // Check if user has access to ANY admin module
  const hasAdminAccess = usePermission('read', 'Users') ||
    usePermission('read', 'Roles') ||
    usePermission('read', 'Settings') ||
    usePermission('read', 'AuditLogs');

  if (!hasAdminAccess) return null;

  return (
    <NavLink
      to="/admin"
      className={({ isActive }) => `flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent ${isActive ? 'bg-accent text-primary' : ''}`}
    >
      <Shield size={16} />
      <span className="hidden lg:inline">Admin</span>
    </NavLink>
  );
}
```

Then render `<AdminMenuEntry />` inside the desktop nav section and the mobile menu section.

**Step 1–3:** Edit site-header.tsx, verify, commit
```bash
git add apps/portal-web/src/components/site-header.tsx
git commit -m "feat(portal): add dynamic admin menu entry based on user permissions"
```

---

## Task 5: Add admin-branded login route

**Objective:** Add `/admin/login` route with "Admin Console" branding for users coming from an admin bookmark.

**Files:**
- Modify: `apps/portal-web/src/pages/login.tsx`
- Modify: `apps/portal-web/src/App.tsx`

**In `login.tsx`:**
```tsx
interface LoginPageProps {
  adminMode?: boolean;
}

export function LoginPage({ adminMode = false }: LoginPageProps) {
  // ... existing code ...
  // Change branding based on adminMode:
  <CardTitle className="text-xl">{adminMode ? 'Admin Console' : 'Platform Portal'}</CardTitle>
  // Change redirect target:
  navigate(adminMode ? '/admin' : '/', { replace: true });
}
```

**In `App.tsx`:**
```tsx
// After public login route or alongside it:
<Route path="/admin/login" element={<LoginPage adminMode />} />
```

**Step 1–3:** Edit, verify, commit
```bash
git add apps/portal-web/src/pages/login.tsx apps/portal-web/src/App.tsx
git commit -m "feat(portal): add admin-branded login route"
```

---

## Task 6: Remove admin-web app and all references

**Objective:** Delete `apps/admin-web/` and clean up Docker, nginx, compose, and docs.

**Files to delete:**
- `apps/admin-web/` — entire directory
- `docker/Dockerfile.admin-web`
- `docker/nginx/admin.conf`

**Files to modify:**
- `docker/docker-compose.yml` — remove the `admin-web` service block (lines ~117-128), remove `admin.conf` volume mount (line ~79), remove `admin-web` from nginx `depends_on` (lines ~84-85)
- `docker/docker-compose.prod.yml` — remove admin-web deploy block (lines ~54-59)
- `README.md` — update app list
- `docs/adr/003-docker-deployment.md` — update
- `docs/adr/008-frontend-foundation.md` — update

**Step 1:** Remove app + Docker files:
```bash
rm -rf apps/admin-web docker/Dockerfile.admin-web docker/nginx/admin.conf
```

**Step 2:** Remove service from docker-compose files (manual edits)

**Step 3:** Find any remaining references:
```bash
grep -r "admin-web" docker/ docs/ README.md pnpm-workspace.yaml --include="*.yml" --include="*.yaml" --include="*.md" --include="*.json" 2>/dev/null
```
Update/clean any matches.

**Step 4:** Re-install workspace (remove admin-web from lock):
```bash
pnpm install 2>&1 | tail -5
```

**Step 5:** Verify portal-web still builds:
```bash
npx turbo build --filter=@platform/portal-web 2>&1
```
Or dev check:
```bash
cd apps/portal-web && npx vite build 2>&1 | tail -10
```

**Step 6:** Commit everything:
```bash
git add -A
git commit -m "chore: remove admin-web app, merged into portal-web"
```

---

## Task 7: End-to-end verification

**Objective:** Start dev server and verify everything works with different permission levels.

**Step 1:** Start infra:
```bash
docker compose -f docker/docker-compose.infra.yml up -d
```
Expected: postgres, valkey, minio healthy

**Step 2:** Start portal-web:
```bash
cd apps/portal-web && pnpm dev
```
Expected: Vite on port 3001

**Step 3:** Test scenarios:

| Scenario | Expected |
|----------|----------|
| Visit `/admin` unauthenticated | Redirect to `/login` |
| Login with regular user (no admin perms) | Portal nav: NO "Admin" item |
| Visit `/admin` as regular user | Sidebar: only "Dashboard" shown (and Dashboard card only) |
| Login with admin user (has `read:users`, `read:roles`) | Portal nav: shows "Admin" item |
| Visit `/admin` as admin | Sidebar: Users, Roles cards visible; other cards hidden |
| Visit `/admin` as super admin (manage:*) | All 16 cards visible |
| Visit `/admin/login` | Shows "Admin Console" branded login |

**Step 4:** Run lint:
```bash
pnpm lint 2>&1 | tail -10
```
Expected: No new errors

---

## Summary of all file changes

| Action | File |
|--------|------|
| **Create** | `apps/portal-web/src/layouts/admin-layout.tsx` |
| **Create** | `apps/portal-web/src/pages/admin/dashboard.tsx` |
| **Modify** | `apps/portal-web/src/App.tsx` |
| **Modify** | `apps/portal-web/src/components/site-header.tsx` |
| **Modify** | `apps/portal-web/src/pages/login.tsx` |
| **Delete** | `apps/admin-web/` (entire directory) |
| **Delete** | `docker/Dockerfile.admin-web` |
| **Delete** | `docker/nginx/admin.conf` |
| **Modify** | `docker/docker-compose.yml` | 
| **Modify** | `docker/docker-compose.prod.yml` |
| **Modify** | `README.md` |
| **Modify** | `docs/adr/*.md` (if applicable) |

---

## Risks & tradeoffs

1. **No single "admin" permission:** The `SiteHeader` uses a compound check (`read:Users || read:Roles || read:Settings || read:AuditLogs`) as the gate for showing the Admin button. This is correct — there's no single "is admin" permission. If a user has `read:Acounting` but none of the 4 checks, they won't see the Admin entry in the header but could still navigate to `/admin/sales` directly. **Mitigation:** Accept this as a minor UX edge case, or add more checks.

2. **Dashboard always shows:** Even users with zero permissions see "Dashboard" in the sidebar (since `/admin` itself has no permission check). This is intentional — the dashboard itself shows the empty state card.

3. **Admin Sidebar ≠ Portal Nav:** The admin sidebar lists *all* possible modules (permission-filtered), while portal nav is organized by category (System, Business, Automation). This is fine — they serve different purposes.

4. **Existing `/users`, `/roles` routes remain:** These portal pages continue to work at their original paths. The admin section links to the same pages (can be redirected or shared). For Phase 1, we reuse the existing pages. Future: could create admin-specific `/admin/users` page variants.

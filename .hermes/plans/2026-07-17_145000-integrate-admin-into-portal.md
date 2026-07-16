# Integrate Admin Web into Portal Web

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Merge `apps/admin-web` into `apps/portal-web` so there is one unified frontend SPA with role-based access — eliminating duplicate code, Docker images, and route maintenance.

**Architecture:** `portal-web` already has all the pages admin-web has and more. The integration involves adding permission-gated menu sections (visible only to admin roles), optionally creating a dedicated Admin Dashboard page, preserving admin-style sidebar layout as an alternative layout for admin sections, then removing the admin-web app and all its references across Docker, CI, and turbo config.

**Tech Stack:** React 19 + Vite 6 + Tailwind 4 + react-router-dom v7 + Zustand + CASL (usePermission hook) + @platform/ui

---
## Audit: admin-web vs portal-web

Before starting, understand what admin-web has that portal-web does NOT already cover:

| Item | admin-web | portal-web | Action |
|------|-----------|------------|--------|
| **Login page** | "Admin Console" branded | "Platform Portal" branded | Add "Admin Console" route at `/admin/login` |
| **Dashboard** | Simple "Admin Dashboard" with Sign Out | Rich Dashboard with full SiteHeader | Create `/admin` Admin Dashboard page |
| **Layout** | Sidebar-based (DashboardLayout) | Top nav + dropdown menus (SiteHeader) | Keep both layouts; use sidebar for admin routes |
| **Users** | Placeholder link | Full Users page | Already exists |
| **Roles** | Placeholder link | Full Roles page | Already exists |
| **Settings** | Placeholder link | Full Settings page | Already exists |
| **ThemeToggle** | Missing | Has it | Already in portal |
| **NotificationBell** | Missing | Has it | Already in portal |
| **Perm checks** | No (any authenticated user sees all) | Has `usePermission` hook per menu | Add to admin nav items |

**Conclusion:** portal-web is the superset. The integration is about:
1. Adding an **Admin section** menu to SiteHeader (gated by `manage:admin` permission)
2. Creating an **Admin Dashboard** page (or dedicated `/admin` landing)
3. Creating a **sidebar-based admin layout** (reusing the admin-web pattern under `/admin/*` routes)
4. Ensuring permission gating on admin features
5. Removing admin-web app entirely

---

## Task 1: Create Admin Layout (sidebar-based)

**Objective:** Create a sidebar-based layout for admin routes in portal-web, modeled on admin-web's `DashboardLayout` but with richer navigation and permission gating.

**Files:**
- Create: `apps/portal-web/src/layouts/admin-layout.tsx`
- Modify: `apps/portal-web/src/App.tsx`

**Admin Layout (`admin-layout.tsx`):**

```tsx
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, usePermission } from '@platform/hooks';
import { NotificationBell } from '../components/notification-bell';
import {
  ChevronDown, Menu, X, LayoutDashboard, Users, Shield,
  Settings, LogOut, Activity, Key, Bell, FileText
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={16} /> },
  { label: 'Users', href: '/admin/users', icon: <Users size={16} />, permission: 'read:users' },
  { label: 'Roles', href: '/admin/roles', icon: <Shield size={16} />, permission: 'read:roles' },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: <Activity size={16} />, permission: 'read:audit-logs' },
  { label: 'API Keys', href: '/admin/api-keys', icon: <Key size={16} />, permission: 'read:api-keys' },
  { label: 'System Settings', href: '/admin/settings', icon: <Settings size={16} />, permission: 'manage:settings' },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    clearAuth();
    navigate('/login', { replace: true });
  };

  const visibleNav = adminNav.filter(
    (item) => !item.permission || usePermission(item.permission)
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            {user?.displayName?.charAt(0) ?? 'A'}
          </div>
          <span className="text-sm font-semibold">Admin Console</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleNav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
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

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:ml-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-card px-4 shadow-sm">
          <button
            className="rounded-lg p-2 hover:bg-accent lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
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

**Step 1:** Write the file above to `apps/portal-web/src/layouts/admin-layout.tsx`

**Step 2:** Verify it exists and has no syntax errors:
Run: `npx tsc --noEmit --project apps/portal-web/tsconfig.json 2>&1 | head -20`
Expected: No errors, or only pre-existing errors unrelated to this new file.

**Step 3:** Commit
```bash
git add apps/portal-web/src/layouts/admin-layout.tsx
git commit -m "feat(portal): add admin sidebar layout"
```

---

## Task 2: Create Admin Dashboard page

**Objective:** Create a dedicated admin dashboard landing page with system-level stats, replacing admin-web's simple placeholder.

**Files:**
- Create: `apps/portal-web/src/pages/admin/dashboard.tsx`
- Create: `apps/portal-web/src/pages/admin/index.ts`

**Step 1:** Create `apps/portal-web/src/pages/admin/index.ts`:
```ts
export { AdminDashboardPage } from './dashboard';
```

**Step 2:** Create `apps/portal-web/src/pages/admin/dashboard.tsx` — a page that shows:
- System overview cards (Users count, Roles, Active Sessions, API Keys)
- Quick links to admin sections
- Recent activity placeholder
- styled with the admin layout context

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@platform/ui';
import { Users, Shield, Key, Activity } from 'lucide-react';

const stats = [
  { label: 'Total Users', value: '—', icon: Users, href: '/admin/users' },
  { label: 'Roles', value: '—', icon: Shield, href: '/admin/roles' },
  { label: 'API Keys', value: '—', icon: Key, href: '/admin/api-keys' },
  { label: 'Recent Activity', value: '—', icon: Activity, href: '/admin/audit-logs' },
];

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System overview and management console.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <a key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Click to manage
                </p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
```

**Step 3:** Verify the file compiles:
Run: `npx tsc --noEmit --project apps/portal-web/tsconfig.json 2>&1 | head -20`

**Step 4:** Commit
```bash
git add apps/portal-web/src/pages/admin/
git commit -m "feat(portal): add admin dashboard page"
```

---

## Task 3: Add admin routes to portal-web App.tsx

**Objective:** Register `/admin/*` routes in portal-web's router with AdminLayout wrapper and permission gate (ProtectedRoute + optional admin role check).

**Files:**
- Modify: `apps/portal-web/src/App.tsx`

**Current App.tsx pattern** (from earlier read):
- Uses `lazy()` imports for all pages
- Wraps protected routes in `ProtectedRoute` + `SiteHeader` layout
- Public routes for login, register, forgot-password, reset-password
- Catch-all `*` → NotFound

**Changes needed:**
1. Add lazy imports for AdminDashboardPage
2. Add a new route group under `/admin`:
   ```
   /admin           → AdminLayout > AdminDashboardPage
   /admin/login     → LoginPage (with admin hint)
   ```
3. All admin routes should be protected

**Modified App.tsx (the routing section only):**
```tsx
// Add alongside existing lazy imports:
const AdminDashboardPage = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminDashboardPage })));

// Inside the Routes component, after the public routes block and before the catch-all:
<Route
  path="/admin/login"
  element={
    <LoginPage adminMode />
  }
/>
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<AdminDashboardPage />} />
  {/* Future admin routes go here */}
</Route>
```

**Alternative approach** (if we want admin routes to share the existing user pages):
Since portal-web already has `/users`, `/roles`, etc., admin users can just use them. The admin layout only needs `/admin` dashboard and optional redirects. Let's keep it simple:

**Minimal changes to App.tsx:**
1. Add `AdminDashboardPage` lazy import
2. Add `/admin` route block with `AdminLayout`
3. The existing `/users`, `/roles` etc. remain accessible from the user portal nav; admin users see additional "Admin" menu items in the SiteHeader that link to `/admin/*`.

**Step 1:** Read current App.tsx
Run: `cat apps/portal-web/src/App.tsx`

**Step 2:** Apply these patches:

```typescript
// Add import:
import { AdminLayout } from './layouts/admin-layout';

// Add lazy:
const AdminDashboardPage = lazy(() => import('./pages/admin/dashboard'));

// Add route block inside <Routes> after other protected routes and before <Route path="*">:
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

**Step 3:** Verify
Run: `npx tsc --noEmit --project apps/portal-web/tsconfig.json 2>&1 | head -20`
Expected: No errors

**Step 4:** Commit
```bash
git add apps/portal-web/src/App.tsx
git commit -m "feat(portal): add admin routes with sidebar layout"
```

---

## Task 4: Add Admin menu to SiteHeader (permission-gated)

**Objective:** In `apps/portal-web/src/components/site-header.tsx`, add an "Admin" dropdown menu item that only appears when the user has the `manage:admin` permission. The admin menu links to `/admin` dashboard.

**Files:**
- Modify: `apps/portal-web/src/components/site-header.tsx`

**Changes:**
1. Import `usePermission` from `@platform/hooks`
2. Add an "Admin" menu item (icon: `Shield`) that links to `/admin`
3. Conditionally render it based on `usePermission('manage:admin')` or `usePermission('manage', 'Settings')`
4. Also add it to the user dropdown as a "Switch to Admin Console" link

**Step 1:** Read current site-header.tsx
Run: `cat apps/portal-web/src/components/site-header.tsx`

**Step 2:** Apply edits:
- Import `usePermission` at the top
- Add an admin menu section to the `menuItems` array (permission-gated)
- Or better: add a small "Admin" badge/button in the user dropdown

**Minimal change** — add to the `menuItems` array when the user has permission:
```typescript
// In the component body, before the return:
const canAccessAdmin = usePermission('manage', 'Settings') || usePermission('manage:admin');

// Then in the desktop nav, conditionally render an admin link:
{canAccessAdmin && (
  <NavLink to="/admin"
    className={({ isActive }) => `flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent ${isActive ? 'bg-accent text-primary' : ''}`}
  >
    <Shield size={16} />
    <span className="hidden lg:inline">Admin</span>
  </NavLink>
)}
```

**Step 3:** Verify
Run: `npx tsc --noEmit --project apps/portal-web/tsconfig.json 2>&1 | head -20`

**Step 4:** Commit
```bash
git add apps/portal-web/src/components/site-header.tsx
git commit -m "feat(portal): add permission-gated admin menu to header"
```

---

## Task 5: Remove admin-web app entirely

**Objective:** Delete `apps/admin-web/` and all references across the monorepo config, Docker, and documentation.

**Files to delete:**
- `apps/admin-web/` (entire directory)

**Files to modify:**
- `docker/Dockerfile.admin-web` — delete
- `docker/docker-compose.yml` — remove `admin-web` service block and nginx reference
- `docker/docker-compose.prod.yml` — remove `admin-web` deploy block
- `docker/docker-compose.yml` line 79 — remove `- ./nginx/admin.conf:/etc/nginx/conf.d/admin.conf:ro`
- `docker/docker-compose.yml` lines 84-85 — remove `admin-web` from nginx `depends_on`
- `docker/nginx/admin.conf` — delete (or keep if referenced elsewhere)
- `docker/Makefile` — remove admin-web references if any
- `docker/dev-env.sh` — remove admin-web references if any
- `pnpm-workspace.yaml` — remove `apps/admin-web` entry if explicitly listed
- `README.md` — update app list
- `docs/adr/003-docker-deployment.md` — update
- `docs/adr/008-frontend-foundation.md` — update

**Step 1:** Remove the app:
```bash
rm -rf apps/admin-web
```

**Step 2:** Remove Dockerfile:
```bash
rm docker/Dockerfile.admin-web
rm docker/nginx/admin.conf
```

**Step 3:** Edit `docker/docker-compose.yml`:
- Remove lines 114-128 (admin-web service block)
- Remove line 79 (admin.conf volume mount)
- Remove line 84-85 (admin-web from nginx depends_on)
- Renumber ports/indices

**Step 4:** Edit `docker/docker-compose.prod.yml`:
- Remove lines 54-59 (admin-web deploy block)

**Step 5:** Check and update remaining files:
```bash
grep -r "admin-web" docker/ docs/ README.md pnpm-workspace.yaml 2>/dev/null
```
Update any matches found.

**Step 6:** Verify the workspace is consistent:
```bash
pnpm install 2>&1 | tail -5
```
Expected: success (no errors about missing admin-web workspace)

**Step 7:** Verify Turbo pipeline still works:
```bash
npx turbo build --filter=@platform/portal-web 2>&1 | head -10
```
Expected: portal-web builds successfully (or pre-existing build state)

**Step 8:** Commit
```bash
git add -A
git commit -m "chore: remove admin-web app, merged into portal-web"
```

---

## Task 6: Optional — Add admin redirect and admin login

**Objective:** Make `/admin` redirect unauthenticated users to `/admin/login` (a branded admin login page) instead of the regular `/login`.

**Files:**
- Modify: `apps/portal-web/src/pages/login.tsx` — add an `adminMode` prop or URL param detection
- Modify: `apps/portal-web/src/App.tsx` — add `/admin/login` route

**Approach:** Modify `LoginPage` to accept an optional `adminMode` prop that changes the branding text to "Admin Console" and redirects to `/admin` after login.

**In `login.tsx`:**
```tsx
interface LoginPageProps {
  adminMode?: boolean;
}

export function LoginPage({ adminMode = false }: LoginPageProps) {
  // ... existing code ...
  // Change branding:
  <CardTitle className="text-2xl">{adminMode ? 'Admin Console' : 'Platform Portal'}</CardTitle>
  // Change redirect target:
  navigate(adminMode ? '/admin' : '/', { replace: true });
}
```

**In `App.tsx`:**
```tsx
<Route path="/admin/login" element={<LoginPage adminMode />} />
```

**Step 1–3:** Edit files, verify compilation, commit
```bash
git add apps/portal-web/src/pages/login.tsx apps/portal-web/src/App.tsx
git commit -m "feat(portal): add admin-branded login route"
```

---

## Task 7: Verify everything works end-to-end

**Objective:** Start the dev server and confirm both portal and admin routes function correctly.

**Step 1:** Start the infrastructure:
```bash
docker compose -f docker/docker-compose.infra.yml up -d
```
Expected: postgres, valkey, minio healthy

**Step 2:** Start portal-web dev server:
```bash
cd apps/portal-web && pnpm dev
```
Expected: Vite dev server starts on port 3001

**Step 3:** Visit these URLs in browser:
- `http://localhost:3001/login` — should show login page (unauthenticated)
- `http://localhost:3001/admin` — should redirect to `/login` (protected route)
- After login with admin credentials:
- `http://localhost:3001/` — should show portal dashboard with new "Admin" menu item
- `http://localhost:3001/admin` — should show admin sidebar layout + Admin Dashboard

**Step 4:** Run lint:
```bash
pnpm lint 2>&1 | tail -10
```
Expected: clean (no new errors)

---

## Summary of changes

| File | Action |
|------|--------|
| `apps/portal-web/src/layouts/admin-layout.tsx` | **Create** — sidebar admin layout |
| `apps/portal-web/src/pages/admin/dashboard.tsx` | **Create** — admin dashboard page |
| `apps/portal-web/src/pages/admin/index.ts` | **Create** — barrel export |
| `apps/portal-web/src/App.tsx` | **Modify** — add /admin routes |
| `apps/portal-web/src/components/site-header.tsx` | **Modify** — add admin menu item (permission-gated) |
| `apps/portal-web/src/pages/login.tsx` | **Modify** — add adminMode prop for branded login |
| `apps/admin-web/` | **Delete** — entire app directory |
| `docker/Dockerfile.admin-web` | **Delete** |
| `docker/nginx/admin.conf` | **Delete** |
| `docker/docker-compose.yml` | **Modify** — remove admin-web service + nginx refs |
| `docker/docker-compose.prod.yml` | **Modify** — remove admin-web deploy block |
| `pnpm-workspace.yaml` | **Modify** — remove admin-web entry if listed |
| `README.md`, `docs/adr/*` | **Modify** — update app list |

---

## Risks and tradeoffs

1. **Permission check strategy:** Admin menu visibility uses `usePermission('manage', 'Settings')` as proxy for "is admin". If no user has this permission yet in seed data, the menu won't appear until the permission model is set up. **Mitigation:** Ensure admin seed/user has `manage:*` or `manage:Settings` permission.

2. **Route conflicts:** Portal-web already has `/users`, `/roles`, etc. at the top level. Admin users can access these directly OR we can create `/admin/users`, `/admin/roles` as separate pages with admin-specific views. **Decision:** For Phase 1, keep routes flat — existing `/users` etc. work for everyone. Only `/admin` is new as the admin dashboard landing.

3. **CSS duplication:** Admin layout has its own sidebar styles. Ensure they don't conflict with portal's top-nav styles. Both use Tailwind utility classes so conflicts are unlikely.

4. **Backwards compat:** If any bookmarks or external links point to `admin-web:8080`, they will break. **Mitigation:** Add a temporary nginx redirect rule if needed.

## Open questions

- [ ] Should admin routes mirror the user routes (e.g. `/admin/users`, `/admin/roles`) with admin-specific views, or should we keep them as-is?
- [ ] What permission string should gate access to the admin section? (current guess: `manage:Settings` or `manage:admin`)
- [ ] Should the portal-web `AdminLayout` include a "Switch to User Portal" link back to `/`?

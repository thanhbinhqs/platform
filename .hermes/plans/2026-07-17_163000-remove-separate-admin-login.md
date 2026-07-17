# Remove Separate Admin Login Route

> **For Hermes:** Implement directly.

**Goal:** Remove `/admin/login` route and `adminMode` prop from LoginPage since admin is now integrated into portal-web and permission-gating is handled by JWT.

**Architecture:** Single login route (`/login`) for all users. After login, JWT permissions determine whether admin features are visible. No separate admin auth flow needed.

**Tech Stack:** React Router v7, React 19, Vite 6

---

### Task 1: Remove `adminMode` from LoginPage

**Objective:** Revert LoginPage to original — no `adminMode` prop, no conditional branding.

**Files:**
- Modify: `apps/portal-web/src/pages/login.tsx`

**Changes:**

1. Remove interface `LoginPageProps` and `adminMode` parameter — revert to `export function LoginPage()`
2. Change navigate target back from `navigate(adminMode ? '/admin' : '/')` → `navigate('/')`
3. Change title from `{adminMode ? 'Admin Console' : 'Platform Portal'}` → `Platform Portal`

**Apply the three patches in order:**

```patch
# 1. Remove adminMode prop
- export function LoginPage({ adminMode = false }: LoginPageProps) {
+ export function LoginPage() {

# 2. Fix redirect
- navigate(adminMode ? '/admin' : '/', { replace: true });
+ navigate('/', { replace: true });

# 3. Fix title
- <CardTitle className="text-2xl">{adminMode ? 'Admin Console' : 'Platform Portal'}</CardTitle>
+ <CardTitle className="text-2xl">Platform Portal</CardTitle>
```

### Task 2: Remove `/admin/login` route from App.tsx

**Objective:** Delete the redundant admin login route.

**Files:**
- Modify: `apps/portal-web/src/App.tsx`

**Changes:**

Remove one line:

```patch
-            <Route path="/admin/login" element={<LoginPage adminMode />} />
```

Since `LoginPage` no longer has `adminMode`, the route would not compile. Just delete it.

### Task 3: Verify build + dev server

**Steps:**

```bash
cd /home/binh/platform
npx tsc --noEmit --project apps/portal-web/tsconfig.json
# Expected: 0 errors

pnpm run --filter @platform/portal-web build
# Expected: ✓ built in ~4s
```

### Verification

| Scenario | Expected |
|----------|----------|
| User visits `/admin/login` | 404 (no longer exists) |
| User visits `/login` | Normal login page renders |
| Admin user logs in at `/login` | Gets JWT, sees [Admin] in header |
| Non-admin user logs in at `/login` | Gets JWT, no [Admin] in header |
| Build succeeds | 0 errors |

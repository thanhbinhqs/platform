# ADR-008: Frontend Foundation

## Status

Accepted

## Context

The platform needs modern, maintainable, and performant frontend applications for both portal users and admin operators. The frontend must integrate with the NestJS API backend (Phase 6‑7) and share design tokens, components, hooks, and types across apps.

## Decision

We adopt a monorepo frontend architecture with the following structure:

### Apps

- **`apps/portal-web`** — Portal frontend (React + Vite + Tailwind CSS v4)
- **`apps/admin-web`** — Admin console frontend (same tech stack)

### Shared Packages

- **`packages/shared-types`** — API response types (`ApiResponse<T>`, `PaginatedResponse<T>`) and IAM type definitions (`User`, `Role`, `Permission`, `LoginRequest`/`LoginResponse`, etc.)
- **`packages/hooks`** — Zustand auth store (`useAuthStore`), responsive design (`useMediaQuery`), persistent state (`useLocalStorage`)
- **`packages/api-client`** — Axios instance with auth interceptor (auto-attach Bearer token, 401 → refresh → retry → redirect to `/login`). Provides typed wrappers: `authApi.login`, `authApi.me`, `authApi.refresh`
- **`packages/dynamic-form`** — Form builder with Zod resolver (`zodResolver(fields)` → `z.object(…)`)
- **`packages/ui`** — shadcn/ui‑style design system: `Button`, `Input`, `Card`, `Label`, `Dialog`, `Skeleton`, `ThemeProvider`, and `cn()` utility (clsx + tailwind-merge)

### Tailwind CSS v4

Uses `@tailwindcss/vite` plugin (no PostCSS config). Themes defined via `@theme {}` in CSS cascading into `@theme { … }` blocks. Color tokens follow shadcn conventions: `--color-primary`, `--color-muted`, `--color-destructive`, etc.

### Routing & Auth

- `react-router-dom` v7 with lazy‑loaded routes
- `ProtectedRoute` component checks `useAuthStore.isAuthenticated`; redirects to `/login` if unauthenticated
- Login page calls `authApi.login`, stores tokens in `localStorage`, syncs Zustand store, navigates to `/`

### Layout

Both apps share a responsive layout pattern:
- Desktop: persistent 256px sidebar + header + main content
- Mobile: hamburger menu overlay

## Consequences

- **Positive:** Full‑stack monorepo with shared types ensures API contract consistency between backend and frontend
- **Positive:** Tailwind v4 eliminates PostCSS config overhead
- **Positive:** Zustand auth store + Axios interceptor provides a clean auth flow
- **Positive:** Design tokens centralized in CSS `@theme`, making theming trivial
- **Neutral:** Portal and admin apps are structurally identical but independently deployable
- **Risk:** `api-client` reads `import.meta.env.VITE_API_BASE_URL` at compile time; must ensure Vite env vars are set per app

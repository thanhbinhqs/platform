import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, Toaster } from '@platform/ui';
import { queryClient } from './lib/query-client';
import { useAuthStore } from '@platform/hooks';
import { LoginPage } from './pages/login';
import { ForgotPasswordPage } from './pages/forgot-password';
import { ResetPasswordPage } from './pages/reset-password';
import { DashboardLayout } from './layouts/dashboard-layout';
import { ProtectedRoute } from './components/protected-route';
import { RequirePermission } from './components/require-permission';
import { ErrorBoundary } from './components/error-boundary';
import { NotFoundPage } from './pages/not-found';
import { ForbiddenPage } from './pages/forbidden';
import { IntroPage } from './pages/intro/intro-page';

// ─── Lazy-loaded pages (code-split) ──────────────────────────────
const DashboardPage = lazy(() => import('./pages/dashboard').then(m => ({ default: m.DashboardPage })));
const UsersPage = lazy(() => import('./pages/users').then(m => ({ default: m.UsersPage })));
const RolesPage = lazy(() => import('./pages/roles').then(m => ({ default: m.RolesPage })));
const SettingsPage = lazy(() => import('./pages/settings').then(m => ({ default: m.SettingsPage })));
const AuditLogsPage = lazy(() => import('./pages/audit-logs').then(m => ({ default: m.AuditLogsPage })));
const WorkflowsPage = lazy(() => import('./pages/workflows').then(m => ({ default: m.WorkflowsPage })));
const WebhooksPage = lazy(() => import('./pages/webhooks').then(m => ({ default: m.WebhooksPage })));
const RulesPage = lazy(() => import('./pages/rules').then(m => ({ default: m.RulesPage })));
const TenantsPage = lazy(() => import('./pages/tenants').then(m => ({ default: m.TenantsPage })));
const ScheduledJobsPage = lazy(() => import('./pages/scheduled-jobs').then(m => ({ default: m.ScheduledJobsPage })));
const IntegrationsPage = lazy(() => import('./pages/integrations').then(m => ({ default: m.IntegrationsPage })));
const NotificationsPage = lazy(() => import('./pages/notifications').then(m => ({ default: m.NotificationsPage })));
const FeatureFlagsPage = lazy(() => import('./pages/feature-flags').then(m => ({ default: m.FeatureFlagsPage })));
const StoragePage = lazy(() => import('./pages/storage').then(m => ({ default: m.StoragePage })));
const DataGridDemoPage = lazy(() => import('./pages/data-grid-demo').then(m => ({ default: m.DataGridDemoPage })));
const ApiKeysPage = lazy(() => import('./pages/api-keys').then(m => ({ default: m.ApiKeysPage })));
const ProductsPage = lazy(() => import('./pages/products').then(m => ({ default: m.ProductsPage })));
const OrdersPage = lazy(() => import('./pages/orders').then(m => ({ default: m.OrdersPage })));
const InvoicesPage = lazy(() => import('./pages/invoices').then(m => ({ default: m.InvoicesPage })));
const DelegationsPage = lazy(() => import('./pages/delegations').then(m => ({ default: m.DelegationsPage })));
const SpaceJourneyPage = lazy(() => import('./pages/intro/space-journey-page').then(m => ({ default: m.SpaceJourneyPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

/** Wrap a lazy-loaded page with Suspense + optional permission gate. */
function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => { initialize(); }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="portal-theme">
        <BrowserRouter>
          <Routes>
            {/* ── Public routes ──────────────────────────────────── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/intro"
              element={
                <Suspense fallback={<PageLoader />}>
                  <IntroPage />
                </Suspense>
              }
            />
            <Route
              path="/space-journey"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SpaceJourneyPage />
                </Suspense>
              }
            />
            <Route path="/forbidden" element={<ForbiddenPage />} />

            {/* ── Protected routes (auth required) ──────────────── */}
            <Route
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <DashboardLayout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<LazyPage><DashboardPage /></LazyPage>} />
              {/* Open to all authenticated users */}
              <Route path="data-grid-demo" element={<LazyPage><DataGridDemoPage /></LazyPage>} />

              {/* Permission-gated admin routes */}
              <Route path="users" element={<RequirePermission resource="users"><LazyPage><UsersPage /></LazyPage></RequirePermission>} />
              <Route path="users/:id" element={<RequirePermission resource="users"><LazyPage><UsersPage /></LazyPage></RequirePermission>} />
              <Route path="roles" element={<RequirePermission resource="roles"><LazyPage><RolesPage /></LazyPage></RequirePermission>} />
              <Route path="tenants" element={<RequirePermission resource="tenants"><LazyPage><TenantsPage /></LazyPage></RequirePermission>} />
              <Route path="audit-logs" element={<RequirePermission resource="audit-logs"><LazyPage><AuditLogsPage /></LazyPage></RequirePermission>} />
              <Route path="products" element={<RequirePermission resource="products"><LazyPage><ProductsPage /></LazyPage></RequirePermission>} />
              <Route path="orders" element={<RequirePermission resource="orders"><LazyPage><OrdersPage /></LazyPage></RequirePermission>} />
              <Route path="invoices" element={<RequirePermission resource="invoices"><LazyPage><InvoicesPage /></LazyPage></RequirePermission>} />
              <Route path="workflows" element={<RequirePermission resource="workflows"><LazyPage><WorkflowsPage /></LazyPage></RequirePermission>} />
              <Route path="rules" element={<RequirePermission resource="rules"><LazyPage><RulesPage /></LazyPage></RequirePermission>} />
              <Route path="webhooks" element={<RequirePermission resource="webhooks"><LazyPage><WebhooksPage /></LazyPage></RequirePermission>} />
              <Route path="scheduled-jobs" element={<RequirePermission resource="scheduled-jobs"><LazyPage><ScheduledJobsPage /></LazyPage></RequirePermission>} />
              <Route path="integrations" element={<RequirePermission resource="integrations"><LazyPage><IntegrationsPage /></LazyPage></RequirePermission>} />
              <Route path="feature-flags" element={<RequirePermission resource="feature-flags"><LazyPage><FeatureFlagsPage /></LazyPage></RequirePermission>} />
              <Route path="api-keys" element={<LazyPage><ApiKeysPage /></LazyPage>} />
              <Route path="storage" element={<RequirePermission resource="storage"><LazyPage><StoragePage /></LazyPage></RequirePermission>} />
              <Route path="settings" element={<RequirePermission resource="settings"><LazyPage><SettingsPage /></LazyPage></RequirePermission>} />
              <Route path="notifications" element={<LazyPage><NotificationsPage /></LazyPage>} />
              {/* User-specific pages (no extra permission gate) */}
              <Route path="delegations" element={<LazyPage><DelegationsPage /></LazyPage>} />
            </Route>

            {/* ── Catch-all 404 ──────────────────────────────────── */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

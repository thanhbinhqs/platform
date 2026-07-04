import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, Toaster } from '@platform/ui';
import { queryClient } from './lib/query-client';
import { useAuthStore } from '@platform/hooks';
import { LoginPage } from './pages/login';
import { ForgotPasswordPage } from './pages/forgot-password';
import { ResetPasswordPage } from './pages/reset-password';
import { DashboardLayout } from './layouts/dashboard-layout';
import { ProtectedRoute } from './components/protected-route';
import { ErrorBoundary } from './components/error-boundary';
import { NotFoundPage } from './pages/not-found';

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

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <DashboardLayout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
              <Route path="users" element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />
              <Route path="users/:id" element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />
              <Route path="roles" element={<Suspense fallback={<PageLoader />}><RolesPage /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
              <Route path="audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogsPage /></Suspense>} />
              <Route path="workflows" element={<Suspense fallback={<PageLoader />}><WorkflowsPage /></Suspense>} />
              <Route path="webhooks" element={<Suspense fallback={<PageLoader />}><WebhooksPage /></Suspense>} />
              <Route path="rules" element={<Suspense fallback={<PageLoader />}><RulesPage /></Suspense>} />
              <Route path="tenants" element={<Suspense fallback={<PageLoader />}><TenantsPage /></Suspense>} />
              <Route path="scheduled-jobs" element={<Suspense fallback={<PageLoader />}><ScheduledJobsPage /></Suspense>} />
              <Route path="integrations" element={<Suspense fallback={<PageLoader />}><IntegrationsPage /></Suspense>} />
              <Route path="notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
              <Route path="feature-flags" element={<Suspense fallback={<PageLoader />}><FeatureFlagsPage /></Suspense>} />
              <Route path="storage" element={<Suspense fallback={<PageLoader />}><StoragePage /></Suspense>} />
              <Route path="api-keys" element={<Suspense fallback={<PageLoader />}><ApiKeysPage /></Suspense>} />
              <Route path="data-grid-demo" element={<Suspense fallback={<PageLoader />}><DataGridDemoPage /></Suspense>} />
              <Route path="products" element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
              <Route path="orders" element={<Suspense fallback={<PageLoader />}><OrdersPage /></Suspense>} />
              <Route path="invoices" element={<Suspense fallback={<PageLoader />}><InvoicesPage /></Suspense>} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

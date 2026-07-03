import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, Toaster } from '@platform/ui';
import { queryClient } from './lib/query-client';
import { useAuthStore } from '@platform/hooks';
import { LoginPage } from './pages/login';
import { ForgotPasswordPage } from './pages/forgot-password';
import { ResetPasswordPage } from './pages/reset-password';
import { DashboardPage } from './pages/dashboard';
import { UsersPage } from './pages/users';
import { RolesPage } from './pages/roles';
import { SettingsPage } from './pages/settings';
import { AuditLogsPage } from './pages/audit-logs';
import { WorkflowsPage } from './pages/workflows';
import { WebhooksPage } from './pages/webhooks';
import { RulesPage } from './pages/rules';
import { TenantsPage } from './pages/tenants';
import { ScheduledJobsPage } from './pages/scheduled-jobs';
import { IntegrationsPage } from './pages/integrations';
import { NotificationsPage } from './pages/notifications';
import { FeatureFlagsPage } from './pages/feature-flags';
import { StoragePage } from './pages/storage';
import { ApiKeysPage } from './pages/api-keys';
import { DashboardLayout } from './layouts/dashboard-layout';
import { ProtectedRoute } from './components/protected-route';
import { ErrorBoundary } from './components/error-boundary';

export function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

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
              <Route index element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/:id" element={<UsersPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="webhooks" element={<WebhooksPage />} />
              <Route path="rules" element={<RulesPage />} />
              <Route path="tenants" element={<TenantsPage />} />
              <Route path="scheduled-jobs" element={<ScheduledJobsPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="feature-flags" element={<FeatureFlagsPage />} />
              <Route path="storage" element={<StoragePage />} />
              <Route path="api-keys" element={<ApiKeysPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
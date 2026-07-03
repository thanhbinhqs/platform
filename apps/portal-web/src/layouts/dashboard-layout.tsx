import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMediaQuery, useAuthStore, hasPermission } from '@platform/hooks';
import { ThemeToggle } from '../components/theme-toggle';
import { useState, useMemo } from 'react';

type SidebarItem = {
  label: string;
  href: string;
  icon: string;
  permission?: string;
};

const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/', icon: '◻' },
  { label: 'Notifications', href: '/notifications', icon: '🔔' },
  { label: 'Users', href: '/users', icon: '👥', permission: 'manage:users' },
  { label: 'Roles', href: '/roles', icon: '🔐', permission: 'manage:roles' },
  { label: 'Tenants', href: '/tenants', icon: '🏢', permission: 'manage:tenants' },
  { label: 'Workflows', href: '/workflows', icon: '⚡', permission: 'read:workflows' },
  { label: 'Webhooks', href: '/webhooks', icon: '🔗', permission: 'manage:settings' },
  { label: 'Rules', href: '/rules', icon: '⚖️', permission: 'manage:settings' },
  { label: 'Scheduled Jobs', href: '/scheduled-jobs', icon: '⏰', permission: 'manage:settings' },
  { label: 'Integrations', href: '/integrations', icon: '🔌', permission: 'manage:settings' },
  { label: 'Feature Flags', href: '/feature-flags', icon: '🚩', permission: 'manage:settings' },
  { label: 'API Keys', href: '/api-keys', icon: '🔑' },
  { label: 'Storage', href: '/storage', icon: '💾' },
  { label: 'Products', href: '/products', icon: '📦', permission: 'manage:settings' },
  { label: 'Orders', href: '/orders', icon: '🛒' },
  { label: 'Invoices', href: '/invoices', icon: '🧾' },
  { label: 'Settings', href: '/settings', icon: '⚙' },
  { label: 'Audit Logs', href: '/audit-logs', icon: '📋', permission: 'read:audit-logs' },
];

export function DashboardLayout() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const location = useLocation();
  const navigate = useNavigate();

  // Filter sidebar items by user permissions
  const visibleItems = useMemo(
    () =>
      sidebarItems.filter((item) => {
        if (!item.permission) return true;
        if (!user) return false;
        return hasPermission(user.permissions, item.permission);
      }),
    [user],
  );

  // Permission-based redirect: if user navigates to a page they can't access
  const currentItem = sidebarItems.find((item) => {
    if (item.href === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.href);
  });

  // If current page requires a permission the user doesn't have, redirect to dashboard
  if (
    currentItem?.permission &&
    user &&
    !hasPermission(user.permissions, currentItem.permission)
  ) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`
          ${isDesktop ? 'w-64' : 'fixed inset-y-0 left-0 z-50 w-64'}
          ${!isDesktop && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          flex flex-col border-r bg-card transition-transform duration-200
        `}
      >
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 border-b px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            P
          </div>
          <span className="text-base font-semibold">Platform</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              onClick={() => !isDesktop && setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="border-t p-3">
          <ThemeToggle />
        </div>

        {/* User footer */}
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {user?.displayName?.charAt(0)?.toUpperCase() ?? user?.username?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 truncate text-sm font-medium">
              {user?.displayName ?? user?.username ?? 'User'}
            </div>
          </div>
          <button
            onClick={() => { clearAuth(); window.location.href = '/login'; }}
            className="mt-1 w-full rounded-lg px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {!isDesktop && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        {!isDesktop && (
          <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-accent"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm font-semibold">Platform</span>
          </header>
        )}

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

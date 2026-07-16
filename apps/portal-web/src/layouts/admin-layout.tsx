import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@platform/hooks';
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

          <div className="my-2 border-t" />

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
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{user?.displayName ?? user?.username ?? 'User'}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
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
          <button
            className="rounded-lg p-2 hover:bg-accent lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex-1" />
          <button
            className="rounded-lg p-2 transition-colors hover:bg-accent"
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

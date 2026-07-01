import { Outlet, Link } from 'react-router-dom';
import { useMediaQuery } from '@platform/hooks';
import { useState } from 'react';

const sidebarLinks = [
  { label: 'Dashboard', href: '/' },
  { label: 'Users', href: '/users' },
  { label: 'Roles', href: '/roles' },
  { label: 'Settings', href: '/settings' },
];

export function DashboardLayout() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {isDesktop && (
        <aside className="w-64 border-r bg-card p-4">
          <h2 className="mb-6 text-lg font-semibold">Admin</h2>
          <nav className="space-y-1">
            {sidebarLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
      )}

      <div className="flex-1">
        <header className="flex h-14 items-center gap-4 border-b px-6">
          {!isDesktop && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <span className="text-sm text-muted-foreground">Admin Console</span>
        </header>

        {!isDesktop && sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
            <aside className="w-64 border-r bg-card p-4" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-6 text-lg font-semibold">Admin</h2>
              <nav className="space-y-1">
                {sidebarLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </aside>
          </div>
        )}

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

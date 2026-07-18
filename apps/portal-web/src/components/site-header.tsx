import { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@platform/hooks';
import { NotificationBell } from './notification-bell';
import { ChevronDown, Menu, X, LogOut, User, Settings, Shield } from 'lucide-react';
import { hasModuleAccess } from '../lib/admin-modules';

interface MenuItem {
  label: string;
  href?: string;
  icon?: string;
  resource?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', href: '/', icon: '◻' },
  {
    label: 'Administration', icon: '⚙', children: [
      { label: 'Users', href: '/users', icon: '👥', resource: 'users' },
      { label: 'Roles', href: '/roles', icon: '🔐', resource: 'roles' },
      { label: 'Tenants', href: '/tenants', icon: '🏢', resource: 'tenants' },
      { label: 'Audit Logs', href: '/audit-logs', icon: '📋', resource: 'audit-logs' },
      { label: 'Products', href: '/products', icon: '📦' },
      { label: 'Orders', href: '/orders', icon: '🛒' },
      { label: 'Invoices', href: '/invoices', icon: '🧾' },
      { label: 'Workflows', href: '/workflows', icon: '⚡' },
      { label: 'Rules', href: '/rules', icon: '⚖️' },
      { label: 'Webhooks', href: '/webhooks', icon: '🔗', resource: 'webhooks' },
      { label: 'Scheduled Jobs', href: '/scheduled-jobs', icon: '⏰', resource: 'scheduled-jobs' },
      { label: 'Integrations', href: '/integrations', icon: '🔌', resource: 'integrations' },
      { label: 'Feature Flags', href: '/feature-flags', icon: '🚩', resource: 'feature-flags' },
      { label: 'API Keys', href: '/api-keys', icon: '🔑', resource: 'api-keys' },
      { label: 'Storage', href: '/storage', icon: '💾', resource: 'storage' },
      { label: 'All Settings', href: '/settings', icon: '⚙', resource: 'settings' },
    ],
  },
  { label: 'Grid Demo', href: '/data-grid-demo', icon: '📊' },
];

export function SiteHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const permissions = user?.permissions ?? [];

  const visibleMenuItems = useMemo(() => {
    return menuItems
      .map((item) => {
        if (item.children) {
          const visibleChildren = item.children.filter(
            (child) => !child.resource || hasModuleAccess(permissions, child.resource),
          );
          if (visibleChildren.length === 0) return null;
          return { ...item, children: visibleChildren };
        }
        if (item.resource && !hasModuleAccess(permissions, item.resource)) return null;
        return item;
      })
      .filter(Boolean) as MenuItem[];
  }, [permissions]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() ?? user?.username?.charAt(0)?.toUpperCase() ?? 'U';

  return (
    <header ref={navRef} className="sticky top-0 z-50 flex h-14 items-center border-b bg-card px-4 shadow-sm">
      {/* ─── Logo ─── */}
      <NavLink to="/" className="flex items-center gap-2 mr-6 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {user?.displayName?.charAt(0) ?? 'P'}
        </div>
        <span className="hidden text-sm font-semibold sm:inline">Platform</span>
      </NavLink>

      {/* ─── Desktop Navigation ─── */}
      <nav className="hidden md:flex items-center gap-0.5 flex-1">
        {visibleMenuItems.map((item) => (
          <div key={item.label} className="relative">
            {item.children ? (
              <button
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent ${openMenu === item.label ? 'bg-accent text-primary' : ''}`}
                onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
              >
                <span className="text-base">{item.icon}</span>
                <span className="hidden lg:inline">{item.label}</span>
                <ChevronDown size={12} className="text-muted-foreground" />
              </button>
            ) : (
              <NavLink to={item.href!}
                className={({ isActive }) => `flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            )}

            {/* Dropdown submenu */}
            {item.children && openMenu === item.label && (
              <div className="absolute left-0 top-full mt-1 min-w-[200px] rounded-lg border bg-card py-1 shadow-xl z-50">
                {item.children.map((child) => (
                  <NavLink
                    key={child.label}
                    to={child.href!}
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent ${isActive ? 'bg-primary/5 text-primary font-medium' : ''}`}
                    onClick={() => setOpenMenu(null)}
                  >
                    <span className="text-base">{child.icon}</span> {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}

      </nav>

      {/* ─── Right Section: Auth / User ─── */}
      <div className="flex items-center gap-1 ml-auto shrink-0">
        {isAuthenticated ? (
          <>
            <NotificationBell />
            {/* User Dropdown */}
            <div ref={userRef} className="relative">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title={user?.displayName ?? user?.username ?? 'User'}
              >
                {userInitial}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 min-w-[200px] rounded-lg border bg-card py-1 shadow-xl z-50">
                  <div className="border-b px-3 py-2">
                    <p className="text-sm font-medium truncate">{user?.displayName ?? user?.username ?? 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email ?? ''}</p>
                  </div>
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent" onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}>
                    <User size={14} /> Profile & Settings
                  </button>
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent" onClick={() => { navigate('/roles'); setUserMenuOpen(false); }}>
                    <Shield size={14} /> Permissions
                  </button>
                  <div className="border-t mt-1 pt-1">
                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => { clearAuth(); navigate('/login'); }}>
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors" onClick={() => navigate('/login')}>Sign In</button>
            <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors" onClick={() => navigate('/login')}>Register</button>
          </div>
        )}

        {/* Mobile toggle */}
        <button className="md:hidden rounded-lg p-2 hover:bg-accent" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* ─── Mobile Menu ─── */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full border-b bg-card shadow-xl md:hidden max-h-[80vh] overflow-y-auto z-50">
          {visibleMenuItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground">
                    <span className="text-base">{item.icon}</span> {item.label}
                  </div>
                  {item.children.map((child) => (
                    <NavLink key={child.label} to={child.href!}
                      className={({ isActive }) => `flex items-center gap-2 px-8 py-2 text-sm transition-colors hover:bg-accent ${isActive ? 'bg-primary/5 text-primary' : ''}`}
                      onClick={() => setMobileOpen(false)}>
                      <span className="text-base">{child.icon}</span> {child.label}
                    </NavLink>
                  ))}
                </div>
              ) : (
                <NavLink to={item.href!}
                  className={({ isActive }) => `flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-accent ${isActive ? 'bg-primary/5 text-primary' : ''}`}
                  onClick={() => setMobileOpen(false)}>
                  <span className="text-base">{item.icon}</span> {item.label}
                </NavLink>
              )}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

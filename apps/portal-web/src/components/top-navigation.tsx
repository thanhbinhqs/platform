import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@platform/hooks';
import { NotificationBell } from './notification-bell';
import { ThemeToggle } from './theme-toggle';
import { ChevronDown, Menu, X, LogOut } from 'lucide-react';

interface MenuItem {
  label: string;
  href?: string;
  icon?: string;
  permission?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', href: '/', icon: '◻' },
  {
    label: 'Administration', icon: '⚙', children: [
      { label: 'Users', href: '/users', icon: '👥' },
      { label: 'Roles', href: '/roles', icon: '🔐' },
      { label: 'Tenants', href: '/tenants', icon: '🏢' },
      { label: 'Audit Logs', href: '/audit-logs', icon: '📋' },
      { label: 'Products', href: '/products', icon: '📦' },
      { label: 'Orders', href: '/orders', icon: '🛒' },
      { label: 'Invoices', href: '/invoices', icon: '🧾' },
      { label: 'Workflows', href: '/workflows', icon: '⚡' },
      { label: 'Rules', href: '/rules', icon: '⚖️' },
      { label: 'Webhooks', href: '/webhooks', icon: '🔗' },
      { label: 'Scheduled Jobs', href: '/scheduled-jobs', icon: '⏰' },
      { label: 'Integrations', href: '/integrations', icon: '🔌' },
      { label: 'Feature Flags', href: '/feature-flags', icon: '🚩' },
      { label: 'API Keys', href: '/api-keys', icon: '🔑' },
      { label: 'Storage', href: '/storage', icon: '💾' },
      { label: 'Settings', href: '/settings', icon: '⚙' },
    ],
  },
  { label: 'Grid Demo', href: '/data-grid-demo', icon: '📊' },
];

export function TopNavigation() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav ref={navRef} className="sticky top-0 z-50 flex h-14 items-center border-b bg-card px-4 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">P</div>
        <span className="hidden font-semibold sm:inline">Platform Portal</span>
      </div>

      {/* Desktop Menu */}
      <div className="hidden md:flex items-center gap-1 flex-1">
        {menuItems.map((item) => (
          <div key={item.label} className="relative">
            {item.children ? (
              <button
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent ${openMenu === item.label ? 'bg-accent' : ''}`}
                onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
              >
                <span>{item.icon}</span> {item.label} <ChevronDown size={14} />
              </button>
            ) : (
              <NavLink to={item.href!}
                className={({ isActive }) => `flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`}
              >
                <span>{item.icon}</span> {item.label}
              </NavLink>
            )}

            {/* Dropdown */}
            {item.children && openMenu === item.label && (
              <div className="absolute left-0 top-full mt-1 min-w-[180px] rounded-lg border bg-card py-1 shadow-xl z-50">
                {item.children.map((child) => (
                  <NavLink
                    key={child.label}
                    to={child.href!}
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent ${isActive ? 'bg-primary/5 text-primary font-medium' : ''}`}
                    onClick={() => setOpenMenu(null)}
                  >
                    <span>{child.icon}</span> {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 ml-auto">
        <NotificationBell />
        <ThemeToggle />
        <button onClick={() => { clearAuth(); navigate('/login'); }}
          className="rounded-lg p-2 hover:bg-accent transition-colors" title="Logout">
          <LogOut size={16} />
        </button>

        {/* Mobile toggle */}
        <button className="md:hidden rounded-lg p-2 hover:bg-accent" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full border-b bg-card shadow-xl md:hidden max-h-[80vh] overflow-y-auto z-50">
          {menuItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <div>
                  <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground">
                    <span>{item.icon}</span> {item.label}
                  </div>
                  {item.children.map((child) => (
                    <NavLink key={child.label} to={child.href!}
                      className={({ isActive }) => `flex items-center gap-2 px-8 py-2 text-sm transition-colors hover:bg-accent ${isActive ? 'bg-primary/5 text-primary' : ''}`}
                      onClick={() => setMobileOpen(false)}>
                      <span>{child.icon}</span> {child.label}
                    </NavLink>
                  ))}
                </div>
              ) : (
                <NavLink to={item.href!}
                  className={({ isActive }) => `flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-accent ${isActive ? 'bg-primary/5 text-primary' : ''}`}
                  onClick={() => setMobileOpen(false)}>
                  <span>{item.icon}</span> {item.label}
                </NavLink>
              )}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}

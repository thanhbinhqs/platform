import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@platform/ui';
import apiClient from '@platform/api-client';
import { Package, Users, ShoppingCart, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: any;
  color: string;
}

export function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([
    { title: 'Total Users', value: '—', change: '', trend: 'up', icon: Users, color: 'bg-blue-500' },
    { title: 'Active Products', value: '—', change: '', trend: 'up', icon: Package, color: 'bg-green-500' },
    { title: 'Open Orders', value: '—', change: '', trend: 'up', icon: ShoppingCart, color: 'bg-orange-500' },
    { title: 'Alerts', value: '—', change: '', trend: 'down', icon: AlertTriangle, color: 'bg-red-500' },
  ]);

  // Fetch real data
  const { data: usersData } = useQuery({ queryKey: ['users-count'], queryFn: () => apiClient.get('/users?limit=1'), retry: false });
  const { data: productsData } = useQuery({ queryKey: ['products-count'], queryFn: () => apiClient.get('/sales/products'), retry: false });
  const { data: ordersData } = useQuery({ queryKey: ['orders-count'], queryFn: () => apiClient.get('/sales/orders'), retry: false });

  useEffect(() => {
    if (usersData?.data?.data) {
      setStats(prev => prev.map((s, i) => {
        if (i === 0) return { ...s, value: String(usersData.data.data.total || usersData.data.data.length || '—') };
        if (i === 1 && productsData?.data?.data) return { ...s, value: String(productsData.data.data.total || productsData.data.data.length || '—') };
        if (i === 2 && ordersData?.data?.data) return { ...s, value: String(ordersData.data.data.total || ordersData.data.data.length || '—') };
        return s;
      }));
    }
  }, [usersData, productsData, ordersData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">System overview and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                  {stat.change && (
                    <p className={`mt-1 flex items-center gap-1 text-xs ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      <TrendingUp size={12} /> {stat.change}
                    </p>
                  )}
                </div>
                <div className={`rounded-lg p-2.5 ${stat.color} bg-opacity-10`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 font-semibold flex items-center gap-2"><Activity size={18} /> Recent Activity</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>System health check passed</span>
              <span className="ml-auto text-xs">2 min ago</span>
            </div>
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>New user registered</span>
              <span className="ml-auto text-xs">15 min ago</span>
            </div>
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span>Order #1234 status changed to SHIPPED</span>
              <span className="ml-auto text-xs">1 hour ago</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Workflow 'Jig Inspection' completed</span>
              <span className="ml-auto text-xs">2 hours ago</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 font-semibold flex items-center gap-2"><Package size={18} /> Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add User', icon: '👤', href: '/users' },
              { label: 'New Product', icon: '📦', href: '/products' },
              { label: 'Create Order', icon: '🛒', href: '/orders' },
              { label: 'View Audit', icon: '📋', href: '/audit-logs' },
            ].map((action, i) => (
              <a key={i} href={action.href}
                className="flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-4 text-sm font-medium hover:bg-accent transition-colors">
                <span className="text-lg">{action.icon}</span>
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@platform/ui';
import { useAuthStore, useMediaQuery } from '@platform/hooks';
import apiClient from '@platform/api-client';
import type { User, Role } from '@platform/shared-types';
import { useNavigate } from 'react-router-dom';

type StatCard = {
  title: string;
  value: string | number;
  description: string;
  icon: string;
};

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const r = await apiClient.get('/users');
      return r.data.data.data as User[];
    },
  });
}

function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const r = await apiClient.get('/roles');
      return r.data.data as Role[];
    },
  });
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isMobile = !useMediaQuery('(min-width: 768px)');
  const navigate = useNavigate();
  const { data: users } = useUsers();
  const { data: roles } = useRoles();

  const stats: StatCard[] = [
    {
      title: 'Total Users',
      value: users?.length ?? '—',
      description: 'Registered accounts',
      icon: '👥',
    },
    {
      title: 'Roles',
      value: roles?.length ?? '—',
      description: 'Access roles defined',
      icon: '🔐',
    },
    {
      title: 'Permissions',
      value: user?.permissions?.length ?? 0,
      description: 'Your assigned permissions',
      icon: '✓',
    },
    {
      title: 'Status',
      value: 'Online',
      description: 'API server status',
      icon: '●',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back, {user?.displayName ?? user?.username ?? 'User'}.
        </p>
      </div>

      {/* Stats grid */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <span className="text-lg">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/users')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              👥 Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage user accounts, assign roles, and control access.
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/roles')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔐 Roles & Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define roles and configure granular permissions.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User info card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="text-sm font-medium">{user?.username}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Roles</p>
              <p className="text-sm font-medium">
                {user?.roles?.map((r) => r.name).join(', ') ?? '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Permissions</p>
              <p className="text-sm font-medium">{user?.permissions?.length ?? 0} assigned</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

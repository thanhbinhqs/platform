import { useAuthStore } from '@platform/hooks';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@platform/ui';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
      <p className="text-muted-foreground">
        Welcome, {user?.displayName ?? user?.email ?? 'Admin'}.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Platform Admin Console</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { useAdminModules } from '../../lib/admin-modules';
import { Card, CardContent, CardHeader, CardTitle } from '@platform/ui';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { modules: visibleModules, hasAnyAccess } = useAdminModules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasAnyAccess
            ? 'Management console — modules you have access to.'
            : "You don't have access to any admin modules."}
        </p>
      </div>

      {hasAnyAccess ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleModules.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => navigate(`/admin${mod.href}`)}
              className="text-left"
            >
              <Card className="h-full cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{mod.label}</CardTitle>
                  <mod.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You don't have permission to access any admin modules.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Contact your administrator to request access.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

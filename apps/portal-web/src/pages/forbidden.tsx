import { Link } from 'react-router-dom';
import { Home, ShieldAlert } from 'lucide-react';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive/60" />
        <h1 className="text-8xl font-bold text-muted-foreground/20">403</h1>
        <h2 className="text-2xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Home size={16} /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

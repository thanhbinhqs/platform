import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ServerErrorPageProps {
  error?: Error | null;
  onRetry?: () => void;
}

export function ServerErrorPage({ error, onRetry }: ServerErrorPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive/60" />
        <h1 className="text-8xl font-bold text-muted-foreground/20">500</h1>
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">
          An unexpected error occurred. Our team has been notified and we're working on a fix.
        </p>
        {error && (
          <details className="mx-auto max-w-md text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Error details
            </summary>
            <pre className="mt-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground overflow-auto max-h-32">
              {error.name}: {error.message}
            </pre>
          </details>
        )}
        <div className="flex items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <RefreshCw size={16} /> Try again
            </button>
          )}
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

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@platform/ui';
import apiClient from '@platform/api-client';

interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  severity: string;
  timestamp: string;
  user?: { id: string; username: string; displayName: string | null } | null;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function useAuditLogs(page: number, limit: number) {
  return useQuery({
    queryKey: ['audit-logs', { page, limit }],
    queryFn: async () => {
      const r = await apiClient.get(`/audit-logs?page=${page}&limit=${limit}&orderBy[timestamp]=desc`);
      return (r.data.data || r.data) as AuditLogResponse;
    },
  });
}

const severityColor: Record<string, string> = {
  CRITICAL: 'text-red-600 bg-red-50 dark:bg-red-950/30',
  ERROR: 'text-red-500 bg-red-50 dark:bg-red-950/30',
  WARNING: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
  INFO: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  DEBUG: 'text-gray-500 bg-gray-50 dark:bg-gray-800',
};

const statusColor: Record<string, string> = {
  SUCCESS: 'text-green-600',
  FAILURE: 'text-red-500',
  DENIED: 'text-amber-600',
  ERROR: 'text-red-600',
};

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const limit = 30;
  const { data, isLoading } = useAuditLogs(page, limit);

  const logs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} entries</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading audit logs…</p>
          ) : logs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No audit logs found.</p>
          ) : (
            <div className="divide-y">
              {logs.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 px-6 py-3 text-sm">
                  {/* Severity badge */}
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${severityColor[entry.severity] || ''}`}>
                    {entry.severity}
                  </span>

                  {/* Action + Resource */}
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium">{entry.action}</span>
                      <span className="text-muted-foreground"> on </span>
                      <span className="font-medium">{entry.resource}</span>
                      {entry.resourceId && (
                        <span className="text-muted-foreground"> #{entry.resourceId.slice(0, 8)}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.user?.displayName ?? entry.user?.username ?? 'System'}
                      {entry.ipAddress && ` · ${entry.ipAddress}`}
                      {' · '}{formatTimestamp(entry.timestamp)}
                    </p>
                  </div>

                  {/* Status */}
                  <span className={`text-xs font-medium ${statusColor[entry.status] || ''}`}>
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
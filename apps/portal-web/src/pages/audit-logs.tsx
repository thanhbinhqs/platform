import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton } from '@platform/ui';
interface Item { id: string; user: any; action: string; entity: string; entityId: string; createdAt: string; [key: string]: unknown; }
export function AuditLogsPage() {
  const [selection, setSelection] = useState<Item[]>([]);
  const { data, isLoading } = useQuery({ queryKey: ['audit-logs'], queryFn: async () => { const r = await fetch('/api/v1/audit-logs', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []); } });
  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'user', header: 'User', cell: ({ getValue }) => (getValue() as any)?.username || '—' },
    { accessorKey: 'action', header: 'Action' },
    { accessorKey: 'entity', header: 'Entity' },
    { accessorKey: 'entityId', header: 'Entity ID' },
    { accessorKey: 'createdAt', header: 'Date', cell: ({ getValue }) => new Date(getValue() as string).toLocaleString() },
  ], []);
  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden"><h1 className="text-2xl font-bold">Audit Logs</h1>
    <DataGrid enableSearch columns={columns} data={data || []} title="Audit Logs" enableSorting enableColumnVisibility enableExport enableDensity pageSize={20} pageSizeOptions={[10, 20, 50, 100]} emptyMessage="No audit logs found." />
  </div>);
}
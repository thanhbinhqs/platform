import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton } from '@platform/ui';
interface Item { id: string; [key: string]: unknown; }
export function IntegrationsPage() {
  const [selection, setSelection] = useState<Item[]>([]);
  const { data, isLoading } = useQuery({ queryKey: ['integrations'], queryFn: async () => { const r = await fetch('/api/v1/integrations', { headers: { 'Content-Type': 'application/json' } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []); } });
  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'provider', header: 'Provider' },
    { accessorKey: 'status', header: 'Status' },
  ], []);
  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Integrations</h1>
    <DataGrid columns={columns} data={data || []} title="Integrations" enableSorting enableColumnVisibility enableExport enableDensity onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No integrations found." />
  </div>);
}
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton } from '@platform/ui';
interface Item { id: string; name: string; triggerType: string; status: string; createdAt: string; [key: string]: unknown; }
export function WorkflowsPage() {
  const [selection, setSelection] = useState<Item[]>([]);
  const { data, isLoading } = useQuery({ queryKey: ['workflows'], queryFn: async () => { const r = await fetch('/api/v1/workflows', { headers: { 'Content-Type': 'application/json' } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []); } });
  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'triggerType', header: 'Trigger' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
  ], []);
  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Workflows</h1>
    <DataGrid columns={columns} data={data || []} title="Workflows" enableSorting enableColumnVisibility enableExport enableDensity onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50]} emptyMessage="No workflows found." />
  </div>);
}
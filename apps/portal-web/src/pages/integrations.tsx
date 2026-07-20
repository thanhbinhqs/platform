import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Puzzle, Trash } from 'lucide-react';
import { CrudDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions } from '../components/bulk-actions';

interface Item { id: string; name: string; type: string; provider: string; status: string; config?: any; createdAt: string; [key: string]: unknown; }

export function IntegrationsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  const { data, isLoading } = useQuery({
    queryKey: ['integrations', page, pageSize],
    queryFn: async () => {
      const r = await fetch(`/api/v1/integrations?page=${page + 1}&limit=${pageSize}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); toast.success('Integration created'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/integrations/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); toast.success('Integrations disconnected'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' }, { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'provider', header: 'Provider' }, { accessorKey: 'status', header: 'Status' },
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Name', required: true },
    { name: 'type', label: 'Type', required: true },
    { name: 'provider', label: 'Provider' },
  ], []);

  const handlePaginationChange = useCallback((p: { pageIndex: number; pageSize: number }) => {
    setPage(p.pageIndex);
    setPageSize(p.pageSize);
  }, []);

  const serverSide = useMemo(() => ({
    manualPagination: true as const,
    manualSorting: false,
    manualFiltering: false,
    pageCount: Math.ceil((data?.total || 0) / pageSize),
    pagination: { pageIndex: page, pageSize },
    onPaginationChange: handlePaginationChange,
  }), [page, pageSize, data?.total, handlePaginationChange]);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Integrations</h1>
      <Button onClick={() => { setDialogOpen(true); }}><Puzzle size={16} className="mr-1" /> Add Integration</Button></div>
    <DataGrid enableSearch columns={columns} data={data?.items || []} title="Integrations" enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No integrations found."
      total={data?.total || 0}
      serverSide={serverSide}
      bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
        { label: 'Disconnect', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Disconnect ${ids.length} integrations?`)) bulkDeleteMutation.mutate(ids); } },
      ]} />} />
    <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen}
      title="Create Integration" fields={formFields} initialValues={{}}
      onSubmit={async (v) => { await createMutation.mutateAsync(v); setDialogOpen(false); }} isPending={createMutation.isPending} />
  </div>);
}

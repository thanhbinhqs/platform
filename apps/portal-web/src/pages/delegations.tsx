import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { UserCheck, Trash } from 'lucide-react';
import { CrudDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions } from '../components/bulk-actions';

interface Item { id: string; name: string; delegationRuleId?: string; type: string; status: string; createdAt: string; [key: string]: unknown; }

export function DelegationsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  const { data, isLoading } = useQuery({
    queryKey: ['delegations', page, pageSize],
    queryFn: async () => {
      const r = await fetch(`/api/v1/delegations?page=${page + 1}&limit=${pageSize}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/delegations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['delegations'] }); toast.success('Delegation created'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/delegations/bulk/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['delegations'] }); toast.success('Delegations revoked'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' }, { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'status', header: 'Status' },
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Name', required: true }, { name: 'type', label: 'Type' },
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
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Delegations</h1>
      <Button onClick={() => { setDialogOpen(true); }}><UserCheck size={16} className="mr-1" /> Add Delegation</Button></div>
    <DataGrid enableSearch columns={columns} data={data?.items || []} title="Delegations" enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No delegations found."
      total={data?.total || 0}
      serverSide={serverSide}
      bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
        { label: 'Revoke', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Revoke ${ids.length} delegations?`)) bulkDeleteMutation.mutate(ids); } },
      ]} />} />
    <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen}
      title="Create Delegation" fields={formFields} initialValues={{}}
      onSubmit={async (v) => { await createMutation.mutateAsync(v); setDialogOpen(false); }} isPending={createMutation.isPending} />
  </div>);
}

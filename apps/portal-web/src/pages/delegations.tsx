import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Trash, UserCheck, Eye, RefreshCw, XCircle, Upload } from 'lucide-react';
import { AppDataGrid } from '../components/app-data-grid';
import { CrudDialog, type CrudField } from '../components/crud-dialog';

interface Item { id: string; name: string; delegationRuleId?: string; type: string; status: string; createdAt: string; [key: string]: unknown; }

export function DelegationsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [sorting, setSorting] = useState<any[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['delegations', page, pageSize, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (sorting.length > 0) { params.set('sortField', sorting[0].id); params.set('sortDir', sorting[0].desc ? 'desc' : 'asc'); }
      const r = await fetch(`/api/v1/delegations?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/delegations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['delegations'] }); toast.success('Delegation created'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/delegations/bulk/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['delegations'] }); toast.success('Delegations revoked'); }, onError: (e: Error) => toast.error(e.message) });

  const contextMenuItems = useMemo(() => [
    { label: 'View Details', icon: <Eye size={14} />, action: 'view' },
    { label: 'Revoke', icon: <XCircle size={14} />, action: 'revoke', disabled: (r: any) => r.status === 'REVOKED' },
    { label: 'Retry', icon: <RefreshCw size={14} />, action: 'retry', disabled: (r: any) => r.status !== 'FAILED' },
  ], []);

      const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'view': toast.info(`View delegation: ${row.name || row.id}`); break;
      case 'revoke': if (confirm(`Revoke delegation ${row.name || row.id}?`)) bulkDeleteMutation.mutate([row.id]); break;
      case 'retry': toast.info(`Retry delegation: ${row.name || row.id}`); break;
    }
  }, [bulkDeleteMutation, toast]);


  const columns = useMemo<any>(() => [
    { accessorKey: 'name', header: 'Name' }, { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'status', header: 'Status' },
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Name', required: true }, { name: 'type', label: 'Type' },
  ], []);

  const filterFields = useMemo(() => [
    { id: 'name', label: 'Name', type: 'text' as const, placeholder: 'Search by name...' },
    { id: 'type', label: 'Type', type: 'text' as const, placeholder: 'Filter by type...' },
    { id: 'status', label: 'Status', type: 'select' as const, options: [{ label: 'All Statuses', value: '' }, { label: 'Active', value: 'ACTIVE' }, { label: 'Pending', value: 'PENDING' }, { label: 'Failed', value: 'FAILED' }, { label: 'Revoked', value: 'REVOKED' }] },
    { id: 'delegationRuleId', label: 'Rule ID', type: 'text' as const, placeholder: 'Filter by rule ID...' },
    { id: 'createdAt', label: 'Created Date', type: 'date-range' as const },
  ], []);

  const bulkActions = useMemo(() => [
    { label: 'Revoke', icon: <Trash size={14} />, onClick: (ids: string[]) => { if (confirm(`Revoke ${ids.length} delegations?`)) bulkDeleteMutation.mutate(ids); } },
  ], []);

  const tableActions = useMemo(() => [
    { label: 'Add Delegation', icon: <UserCheck size={14} />, onClick: () => { setDialogOpen(true); }, variant: 'primary' as const },
    { label: 'Import', icon: <Upload size={14} />, onClick: () => toast.info('Import dialog') },
    { label: 'Sync', icon: <RefreshCw size={14} />, onClick: () => toast.info('Syncing...') },
  ], []);

  const handlePaginationChange = useCallback((p: { pageIndex: number; pageSize: number }) => {
    setPage(p.pageIndex);
    setPageSize(p.pageSize);
  }, []);

  const serverSide = useMemo(() => ({
    manualPagination: true as const,
    manualSorting: true as const,
    manualFiltering: false,
    pageCount: Math.ceil((data?.total || 0) / pageSize),
    pagination: { pageIndex: page, pageSize },
    onPaginationChange: handlePaginationChange,
    onSortingChange: setSorting,
  }), [page, pageSize, data?.total, handlePaginationChange, sorting]);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full"  /></div>;
  return (
    <div className="h-full flex flex-col">
      <AppDataGrid
        columns={columns}
        data={data?.items || []}
        title="Delegations"
        filterFields={filterFields}
        bulkActions={bulkActions}
        tableActions={tableActions}
        enableSelection
        enableRowNumber
        enableSorting
        enableExport
        enableColumnResize
        enableColumnVisibility
        enableDensity
        pageSize={pageSize}
        pageSizeOptions={[10, 15, 25, 50, 100]}
        total={data?.total || 0}
        onSelectionChange={setSelection}
        emptyMessage="No delegations found."
        loading={isLoading}
        serverSide={serverSide}
        contextMenuItems={contextMenuItems}
        onContextMenuAction={handleContextMenuAction}
      />
      <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen}
        title="Create Delegation" fields={formFields} initialValues={{}}
        onSubmit={async (v) => { await createMutation.mutateAsync(v); setDialogOpen(false); }} isPending={createMutation.isPending} />
    </div>
  );
}

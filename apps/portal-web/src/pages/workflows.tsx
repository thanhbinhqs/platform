import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Workflow, Upload, RefreshCw, Trash2, Pencil, Play, Archive, Trash } from 'lucide-react';
import { CrudDialog, type CrudField } from '../components/crud-dialog';
import { AppDataGrid } from '../components/app-data-grid';

interface Item { id: string; name: string; type: string; status: string; trigger?: string; createdAt: string; [key: string]: unknown; }

export function WorkflowsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editItem, setEditItem] = useState<Item | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['workflows', page, pageSize, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const r = await fetch(`/api/v1/workflows?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow created'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/workflows/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflows deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/workflows/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow updated'); }, onError: (e: Error) => toast.error(e.message) });
  const contextMenuItems = useMemo(() => [
    { label: 'Run', icon: <Play size={14} />, action: 'run', disabled: (r: any) => r.status === 'RUNNING' },
    { label: 'Edit', icon: <Pencil size={14} />, action: 'edit' },
    { divider: true },
    { label: 'Archive', icon: <Archive size={14} />, action: 'archive', disabled: (r: any) => r.status === 'ARCHIVED' },
  ], []);

  const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'run': toast.info(`Run workflow: ${row.name}`); break;
      case 'edit': setEditItem(row); setDialogOpen(true); break;
      case 'archive': if (confirm(`Archive workflow ${row.name}?`)) bulkDeleteMutation.mutate([row.id]); break;
    }
  }, [bulkDeleteMutation, toast]);

  const columns = useMemo<any>(() => [
    { accessorKey: 'name', header: 'Name' }, { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'status', header: 'Status' }, { accessorKey: 'trigger', header: 'Trigger' },
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Name', required: true }, { name: 'type', label: 'Type' },
    { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }, { label: 'Draft', value: 'DRAFT' }] },
  ], []);

  const filterFields = useMemo(() => [
    { id: 'name', label: 'Name', type: 'text' as const, placeholder: 'Search by name...' },
    { id: 'type', label: 'Type', type: 'select' as const, options: [{ label: 'All Types', value: '' }, { label: 'Manual', value: 'MANUAL' }, { label: 'Automated', value: 'AUTOMATED' }, { label: 'Triggered', value: 'TRIGGERED' }] },
    { id: 'status', label: 'Status', type: 'select' as const, options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }, { label: 'Draft', value: 'DRAFT' }, { label: 'Archived', value: 'ARCHIVED' }] },
    { id: 'trigger', label: 'Trigger', type: 'text' as const, placeholder: 'Filter by trigger...' },
    { id: 'createdAt', label: 'Created Date', type: 'date-range' as const },
  ], []);

  const handlePaginationChange = useCallback((p: { pageIndex: number; pageSize: number }) => {
    setPage(p.pageIndex);
    setPageSize(p.pageSize);
  }, []);

  const serverSide = useMemo(() => ({
    manualPagination: true as const,
    pageCount: Math.ceil((data?.total || 0) / pageSize),
    pagination: { pageIndex: page, pageSize },
    onPaginationChange: handlePaginationChange,
  }), [page, pageSize, data?.total, handlePaginationChange]);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col">
    <AppDataGrid
      columns={columns} data={data?.items || []} title="Workflows"
      enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber
      onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]}
      emptyMessage="No workflows found."
      total={data?.total || 0}
      serverSide={serverSide}
      filterFields={filterFields}
      bulkActions={[
        { label: 'Delete', icon: <Trash size={14} />, onClick: (ids: string[]) => { if (confirm(`Delete ${ids.length} workflows?`)) bulkDeleteMutation.mutate(ids); } },
      ]}
      tableActions={[
        { label: 'Add Workflow', icon: <Workflow size={14} />, onClick: () => { setEditItem(null); setDialogOpen(true); }, variant: 'primary' as const },
        { label: 'Import', icon: <Upload size={14} />, onClick: () => toast.info('Import dialog') },
        { label: 'Sync', icon: <RefreshCw size={14} />, onClick: () => toast.info('Syncing...') },
      ]}
      contextMenuItems={contextMenuItems} onContextMenuAction={handleContextMenuAction}
    />
    <CrudDialog open={dialogOpen || !!editItem} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
      title={editItem ? "Edit Workflow" : "Create Workflow"} fields={formFields}
      initialValues={editItem || { status: 'DRAFT' }}
      onSubmit={async (v) => { if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, ...v }); setEditItem(null); } else { await createMutation.mutateAsync(v); } setDialogOpen(false); }} isPending={createMutation.isPending || updateMutation.isPending} />
  </div>);
}

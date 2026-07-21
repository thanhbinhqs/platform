import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Clock, Pencil, Play, Trash, Trash2 } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions } from '../components/bulk-actions';

interface Item { id: string; name: string; type: string; cronExpression: string; isActive: boolean; config?: any; createdAt: string; [key: string]: unknown; }

export function ScheduledJobsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<any[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['scheduled-jobs', page, pageSize, debouncedSearch, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sorting.length > 0) { params.set('sortField', sorting[0].id); params.set('sortDir', sorting[0].desc ? 'desc' : 'asc'); }
      const r = await fetch(`/api/v1/scheduled-jobs?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/scheduled-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['scheduled-jobs'] }); toast.success('Job created'); }, onError: (e: Error) => toast.error(e.message) });
  const triggerMutation = useMutation({ mutationFn: async (jobId: string) => { const r = await fetch('/api/v1/scheduled-jobs/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ jobId }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { toast.success('Job triggered'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/scheduled-jobs/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['scheduled-jobs'] }); toast.success('Jobs deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/scheduled-jobs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['scheduled-jobs'] }); toast.success('Job updated'); }, onError: (e: Error) => toast.error(e.message) });
  const contextMenuItems = useMemo(() => [
    { label: 'Run Now', icon: <Play size={14} />, action: 'run', disabled: (r: any) => r.status === 'RUNNING' },
    { label: 'Edit', icon: <Pencil size={14} />, action: 'edit' },
    { divider: true },
    { label: 'Delete', icon: <Trash2 size={14} />, action: 'delete' },
  ], []);

      const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'run': triggerMutation.mutate(row.id); break;
      case 'edit': setEditItem(row); setDialogOpen(true); break;
      case 'delete': setDeleteItem(row); break;
    }
  }, [triggerMutation, bulkDeleteMutation, setEditItem, setDialogOpen, setDeleteItem]);


  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'cronExpression', header: 'Cron' },
    { accessorKey: 'isActive', header: 'Active', cell: ({ getValue }) => getValue() ? '✅' : '❌' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <button className="p-1 hover:text-primary transition-colors" title="Trigger Now" onClick={() => triggerMutation.mutate(row.original.id)}><Play size={14}  /></button>
    )},
  ], [triggerMutation]);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Job Name', required: true },
    { name: 'type', label: 'Type', type: 'select', options: [{ label: 'Script', value: 'SCRIPT' }, { label: 'Webhook', value: 'WEBHOOK' }, { label: 'Task', value: 'TASK' }] },
    { name: 'cronExpression', label: 'Cron Expression', placeholder: '0 0 * * *' },
    { name: 'isActive', label: 'Active', type: 'boolean' },
  ], []);

  const handlePaginationChange = useCallback((p: { pageIndex: number; pageSize: number }) => {
    setPage(p.pageIndex);
    setPageSize(p.pageSize);
  }, []);

  const handleGlobalFilterChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const serverSide = useMemo(() => ({
    manualPagination: true as const,
    manualSorting: true as const,
    manualFiltering: false,
    pageCount: Math.ceil((data?.total || 0) / pageSize),
    pagination: { pageIndex: page, pageSize },
    onPaginationChange: handlePaginationChange,
    sorting,
    onSortingChange: setSorting,
    onGlobalFilterChange: handleGlobalFilterChange,
    globalFilter: search,
  }), [page, pageSize, data?.total, handlePaginationChange, sorting, search]);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Scheduled Jobs</h1>
      <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}><Clock size={16} className="mr-1" /> Add Job</Button></div>
    <DataGrid enableSearch columns={columns} data={data?.items || []} title="Scheduled Jobs" enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No scheduled jobs found."
      total={data?.total || 0}
      serverSide={serverSide}
      bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
        { label: 'Delete', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Delete ${ids.length} jobs?`)) bulkDeleteMutation.mutate(ids); } },
      ]} />}
        contextMenuItems={contextMenuItems} onContextMenuAction={handleContextMenuAction} />
    <CrudDialog open={dialogOpen || !!editItem} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
      title={editItem ? "Edit Scheduled Job" : "Create Scheduled Job"} fields={formFields}
      initialValues={editItem || { isActive: true, type: 'SCRIPT' }}
      onSubmit={async (v) => { if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, ...v }); setEditItem(null); } else { await createMutation.mutateAsync(v); } setDialogOpen(false); }} isPending={createMutation.isPending || updateMutation.isPending} />
    <ConfirmDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
      title="Delete Scheduled Job" message={`Are you sure you want to delete ${deleteItem?.name}?`}
      onConfirm={async () => { await bulkDeleteMutation.mutateAsync([deleteItem!.id]); setDeleteItem(null); }}
      isPending={bulkDeleteMutation.isPending} />
  </div>);
}

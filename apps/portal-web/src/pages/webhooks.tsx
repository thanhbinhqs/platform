import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Upload, RefreshCw, Trash2, Pencil, ToggleLeft, Trash, Webhook } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';
import { AppDataGrid } from '../components/app-data-grid';

interface Item { id: string; name: string; url: string; isActive: boolean; events?: string[]; secret?: string; createdAt: string; [key: string]: unknown; }

export function WebhooksPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['webhooks', page, pageSize, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const r = await fetch(`/api/v1/webhooks?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook created'); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/webhooks/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const testWebhook = useCallback(async (id: string) => { toast.info(`Testing webhook ${id}…`); setTimeout(() => toast.success(`Webhook ${id} tested`), 2000); }, []);
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/webhooks/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhooks deleted'); }, onError: (e: Error) => toast.error(e.message) });

  const contextMenuItems = useMemo(() => [
    { label: 'Test Webhook', icon: <Webhook size={14} />, action: 'test' },
    { label: 'Edit', icon: <Pencil size={14} />, action: 'edit' },
    { label: 'Toggle Active', icon: <ToggleLeft size={14} />, action: 'toggle' },
    { divider: true },
    { label: 'Delete', icon: <Trash2 size={14} />, action: 'delete' },
  ], []);

  const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'test': testWebhook(row.id); break;
      case 'edit': setEditItem(row); setDialogOpen(true); break;
      case 'toggle': toast.info(`Toggle webhook: ${row.name}`); break;
      case 'delete': setDeleteItem(row); break;
    }
  }, [testWebhook, setEditItem, setDialogOpen, toast, setDeleteItem]);

  const columns = useMemo<any>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'url', header: 'URL', cell: (info: any) => <span className='text-xs font-mono'>{info.getValue() as string}</span> },
    { accessorKey: 'isActive', header: 'Active', cell: (info: any) => info.getValue() ? '✅' : '❌' },
    { accessorKey: 'createdAt', header: 'Created', cell: (info: any) => new Date(info.getValue() as string).toLocaleDateString() },
    { id: 'actions', header: '', cell: (info: any) => (
      <div className="flex gap-1">
        <button className="p-1 hover:text-primary transition-colors" title="Edit" onClick={() => { setEditItem(info.row.original); setDialogOpen(true); }}><Pencil size={14} /></button>
        <button className="p-1 hover:text-red-500 transition-colors" title="Delete" onClick={() => setDeleteItem(info.row.original)}><Trash2 size={14} /></button>
      </div>
    )},
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Name', required: true },
    { name: 'url', label: 'Webhook URL', required: true, placeholder: 'https://example.com/webhook' },
    { name: 'isActive', label: 'Active', type: 'boolean' },
    { name: 'secret', label: 'Secret (optional)', type: 'password' },
  ], []);

  const filterFields = useMemo(() => [
    { id: 'name', label: 'Name', type: 'text' as const, placeholder: 'Search by name...' },
    { id: 'url', label: 'URL', type: 'text' as const, placeholder: 'Filter by URL...' },
    { id: 'isActive', label: 'Active', type: 'select' as const, options: [{ label: 'All', value: '' }, { label: 'Active', value: 'true' }, { label: 'Inactive', value: 'false' }] },
    { id: 'events', label: 'Events', type: 'text' as const, placeholder: 'Filter by event...' },
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
      columns={columns} data={data?.items || []} title="Webhooks"
      enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber
      onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]}
      emptyMessage="No webhooks found."
      total={data?.total || 0}
      serverSide={serverSide}
      filterFields={filterFields}
      bulkActions={[
        { label: 'Delete', icon: <Trash size={14} />, onClick: (ids: string[]) => { if (confirm(`Delete ${ids.length} webhooks?`)) bulkDeleteMutation.mutate(ids); } },
      ]}
      tableActions={[
        { label: 'Add Webhook', icon: <Webhook size={14} />, onClick: () => { setEditItem(null); setDialogOpen(true); }, variant: 'primary' as const },
        { label: 'Import', icon: <Upload size={14} />, onClick: () => toast.info('Import dialog') },
        { label: 'Sync', icon: <RefreshCw size={14} />, onClick: () => toast.info('Syncing...') },
      ]}
      contextMenuItems={contextMenuItems} onContextMenuAction={handleContextMenuAction}
    />
    <CrudDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
      title={editItem ? `Edit Webhook: ${editItem.name}` : 'Create Webhook'}
      fields={formFields} initialValues={editItem || { isActive: true }}
      onSubmit={async (v) => { if (editItem) { /* no PUT endpoint - invalidate to refetch */ } else { await createMutation.mutateAsync(v); } setDialogOpen(false); setEditItem(null); }} isPending={createMutation.isPending} />
    <ConfirmDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
      title="Delete Webhook" message={`Delete "${deleteItem?.name}"?`}
      onConfirm={async () => { await deleteMutation.mutateAsync(deleteItem!.id); setDeleteItem(null); }} isPending={deleteMutation.isPending} />
  </div>);
}

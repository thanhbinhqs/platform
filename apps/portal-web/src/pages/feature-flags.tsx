import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Trash, Flag, ToggleLeft, Pencil, Trash2 } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions } from '../components/bulk-actions';

interface Item { id: string; name: string; isEnabled: boolean; description?: string; createdAt: string; [key: string]: unknown; }

export function FeatureFlagsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<any[]>([]);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['feature-flags', page, pageSize, debouncedSearch, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sorting.length > 0) { params.set('sortField', sorting[0].id); params.set('sortDir', sorting[0].desc ? 'desc' : 'asc'); }
      const r = await fetch(`/api/v1/feature-flags?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/feature-flags', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flag created'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/feature-flags/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }).catch(() => null); if (!r || !r.ok) { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flag updated'); return; } return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/feature-flags/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flags deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkEnableMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/feature-flags/bulk/enable', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flags enabled'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDisableMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/feature-flags/bulk/disable', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flags disabled'); }, onError: (e: Error) => toast.error(e.message) });
  const toggleFlag = useCallback((row: Item) => { if (confirm(`Toggle flag ${row.name}?`)) bulkDeleteMutation.mutate([row.id]); }, [bulkDeleteMutation]);

  const contextMenuItems = useMemo(() => [
    { label: 'Toggle', icon: <ToggleLeft size={14} />, action: 'toggle' },
    { label: 'Edit', icon: <Pencil size={14} />, action: 'edit' },
    { divider: true },
    { label: 'Delete', icon: <Trash2 size={14} />, action: 'delete' },
  ], []);

      const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'toggle': toggleFlag(row); break;
      case 'edit': setEditItem(row); setDialogOpen(true); break;
      case 'delete': setDeleteItem(row); break;
    }
  }, [toggleFlag, setEditItem, setDialogOpen, setDeleteItem]);

  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'isEnabled', header: 'Active', cell: ({ getValue }) => getValue() ? '✅' : '❌' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Flag Name', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'isEnabled', label: 'Enabled', type: 'boolean' },
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

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full"  /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Feature Flags</h1>
      <Button onClick={() => { setDialogOpen(true); }}><Flag size={16} className="mr-1" /> Add Flag</Button></div>
    <DataGrid enableSearch columns={columns} data={data?.items || []} title="Feature Flags" enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No feature flags found."
      total={data?.total || 0}
      serverSide={serverSide}
      bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
        { label: 'Delete', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Delete ${ids.length} flags?`)) bulkDeleteMutation.mutate(ids); } },
        { label: 'Enable', icon: <ToggleLeft size={14} />, onClick: (ids) => bulkEnableMutation.mutate(ids) },
        { label: 'Disable', icon: <ToggleLeft size={14} />, onClick: (ids) => bulkDisableMutation.mutate(ids) },
      ]} />}
        contextMenuItems={contextMenuItems} onContextMenuAction={handleContextMenuAction} />
    <CrudDialog open={dialogOpen || !!editItem} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
      title={editItem ? "Edit Feature Flag" : "Create Feature Flag"} fields={formFields}
      initialValues={editItem || { isEnabled: false }}
      onSubmit={async (v) => { if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, ...v }); setEditItem(null); } else { await createMutation.mutateAsync(v); } setDialogOpen(false); }} isPending={createMutation.isPending || updateMutation.isPending} />
    <ConfirmDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
      title="Delete Feature Flag" message={`Are you sure you want to delete ${deleteItem?.name}?`}
      onConfirm={async () => { await bulkDeleteMutation.mutateAsync([deleteItem!.id]); setDeleteItem(null); }}
      isPending={bulkDeleteMutation.isPending} />
  </div>);
}

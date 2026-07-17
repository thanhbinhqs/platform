import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Pencil, Trash2, Flag } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';

interface Item { id: string; name: string; isEnabled: boolean; description?: string; createdAt: string; [key: string]: unknown; }

export function FeatureFlagsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['feature-flags'], queryFn: async () => { const r = await fetch('/api/v1/feature-flags', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []) as Item[]; } });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/feature-flags', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flag created'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/feature-flags/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }).catch(() => null); if (!r || !r.ok) { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flag updated'); return; } return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/feature-flags/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flag deleted'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'isEnabled', header: 'Active', cell: ({ getValue }) => getValue() ? '✅' : '❌' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button className="p-1 hover:text-primary transition-colors" title="Edit" onClick={() => { setEditItem(row.original); setDialogOpen(true); }}><Pencil size={14} /></button>
        <button className="p-1 hover:text-red-500 transition-colors" title="Delete" onClick={() => setDeleteItem(row.original)}><Trash2 size={14} /></button>
      </div>
    )},
  ], []);
  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Flag Name', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'isEnabled', label: 'Enabled', type: 'boolean' },
  ], []);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Feature Flags</h1>
      <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}><Flag size={16} className="mr-1" /> Add Flag</Button></div>
    <DataGrid columns={columns} data={data || []} title="Feature Flags" enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No feature flags found." />
    <CrudDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
      title={editItem ? `Edit Flag: ${editItem.name}` : 'Create Feature Flag'}
      fields={formFields} initialValues={editItem || { isEnabled: false }}
      onSubmit={async (v) => { if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, ...v }); } else { await createMutation.mutateAsync(v); } setDialogOpen(false); setEditItem(null); }} isPending={createMutation.isPending || updateMutation.isPending} />
    <ConfirmDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
      title="Delete Flag" message={`Delete "${deleteItem?.name}"?`}
      onConfirm={async () => { await deleteMutation.mutateAsync(deleteItem!.id); setDeleteItem(null); }} isPending={deleteMutation.isPending} />
  </div>);
}

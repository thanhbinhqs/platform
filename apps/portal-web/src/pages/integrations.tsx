import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Pencil, Trash2, Puzzle } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';

interface Item { id: string; name: string; type: string; provider: string; status: string; config?: any; createdAt: string; [key: string]: unknown; }

export function IntegrationsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['integrations'], queryFn: async () => { const r = await fetch('/api/v1/integrations', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []) as Item[]; } });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); toast.success('Integration created'); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/integrations/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); toast.success('Integration deleted'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' }, { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'provider', header: 'Provider' }, { accessorKey: 'status', header: 'Status' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button className="p-1 hover:text-primary transition-colors" title="Edit" onClick={() => { setEditItem(row.original); setDialogOpen(true); }}><Pencil size={14} /></button>
        <button className="p-1 hover:text-red-500 transition-colors" title="Delete" onClick={() => setDeleteItem(row.original)}><Trash2 size={14} /></button>
      </div>
    )},
  ], []);
  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Name', required: true },
    { name: 'type', label: 'Type', required: true },
    { name: 'provider', label: 'Provider' },
  ], []);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Integrations</h1>
      <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}><Puzzle size={16} className="mr-1" /> Add Integration</Button></div>
    <DataGrid columns={columns} data={data || []} title="Integrations" enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No integrations found." />
    <CrudDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
      title={editItem ? `Edit Integration: ${editItem.name}` : 'Create Integration'}
      fields={formFields} initialValues={editItem || {}} onSubmit={async (v) => { await createMutation.mutateAsync(v); setDialogOpen(false); setEditItem(null); }} isPending={createMutation.isPending} />
    <ConfirmDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
      title="Delete Integration" message={`Delete "${deleteItem?.name}"?`}
      onConfirm={async () => { await deleteMutation.mutateAsync(deleteItem!.id); setDeleteItem(null); }} isPending={deleteMutation.isPending} />
  </div>);
}

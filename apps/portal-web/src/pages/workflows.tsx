import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Pencil, Trash2, Play, Send, Workflow } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';

interface Item { id: string; name: string; triggerType: string; status: string; isActive?: boolean; createdAt: string; [key: string]: unknown; }

export function WorkflowsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['workflows'], queryFn: async () => { const r = await fetch('/api/v1/workflows', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []) as Item[]; } });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow created'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/workflows/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow updated'); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/workflows/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const publishMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/workflows/${id}/publish`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow published'); }, onError: (e: Error) => toast.error(e.message) });
  const executeMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/workflows/${id}/execute`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { toast.success('Execution triggered'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'triggerType', header: 'Trigger' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button className="p-1 hover:text-primary" title="Edit" onClick={() => { setEditItem(row.original); setDialogOpen(true); }}><Pencil size={14} /></button>
        <button className="p-1 hover:text-emerald-500" title="Publish" onClick={() => publishMutation.mutate(row.original.id)}><Send size={14} /></button>
        <button className="p-1 hover:text-amber-500" title="Execute" onClick={() => executeMutation.mutate(row.original.id)}><Play size={14} /></button>
        <button className="p-1 hover:text-red-500" title="Delete" onClick={() => setDeleteItem(row.original)}><Trash2 size={14} /></button>
      </div>
    )},
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Workflow Name', required: true },
    { name: 'triggerType', label: 'Trigger Type', type: 'select', options: [{ label: 'Manual', value: 'MANUAL' }, { label: 'Event', value: 'EVENT' }, { label: 'Schedule', value: 'SCHEDULE' }] },
  ], []);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Workflows</h1>
      <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}><Workflow size={16} className="mr-1" /> Add Workflow</Button></div>
    <DataGrid columns={columns} data={data || []} title="Workflows" enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50]} emptyMessage="No workflows found." />
    <CrudDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
      title={editItem ? `Edit Workflow: ${editItem.name}` : 'Create Workflow'}
      fields={formFields} initialValues={editItem || { triggerType: 'MANUAL' }}
      onSubmit={async (v) => { if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, ...v }); } else { await createMutation.mutateAsync(v); } setDialogOpen(false); setEditItem(null); }} isPending={createMutation.isPending || updateMutation.isPending} />
    <ConfirmDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
      title="Delete Workflow" message={`Delete "${deleteItem?.name}"?`}
      onConfirm={async () => { await deleteMutation.mutateAsync(deleteItem!.id); setDeleteItem(null); }} isPending={deleteMutation.isPending} />
  </div>);
}

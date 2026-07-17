import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Pencil, Trash2, Building2 } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';

interface Item { id: string; name: string; status: string; domain?: string; createdAt: string; [key: string]: unknown; }

export function TenantsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['tenants'], queryFn: async () => { const r = await fetch('/api/v1/tenants', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []) as Item[]; } });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/tenants', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); toast.success('Tenant created'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/tenants/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); toast.success('Tenant updated'); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/tenants/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); toast.success('Tenant deleted'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'domain', header: 'Domain', cell: ({ getValue }) => (getValue() as string) || '—' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button className="p-1 hover:text-primary" title="Edit" onClick={() => { setEditItem(row.original); setDialogOpen(true); }}><Pencil size={14} /></button>
        <button className="p-1 hover:text-red-500" title="Delete" onClick={() => setDeleteItem(row.original)}><Trash2 size={14} /></button>
      </div>
    )},
  ], []);
  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Tenant Name', required: true },
    { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }, { label: 'Suspended', value: 'SUSPENDED' }] },
    { name: 'domain', label: 'Domain', placeholder: 'example.com' },
  ], []);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Tenants</h1>
      <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}><Building2 size={16} className="mr-1" /> Add Tenant</Button></div>
    <DataGrid columns={columns} data={data || []} title="Tenants" enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No tenants found." />
    <CrudDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
      title={editItem ? `Edit Tenant: ${editItem.name}` : 'Create Tenant'}
      fields={formFields} initialValues={editItem || { status: 'ACTIVE' }}
      onSubmit={async (v) => { if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, ...v }); } else { await createMutation.mutateAsync(v); } setDialogOpen(false); setEditItem(null); }} isPending={createMutation.isPending || updateMutation.isPending} />
    <ConfirmDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
      title="Delete Tenant" message={`Delete "${deleteItem?.name}"?`}
      onConfirm={async () => { await deleteMutation.mutateAsync(deleteItem!.id); setDeleteItem(null); }} isPending={deleteMutation.isPending} />
  </div>);
}

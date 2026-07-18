import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Flag, Trash, ToggleLeft } from 'lucide-react';
import { CrudDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions } from '../components/bulk-actions';

interface Item { id: string; name: string; isEnabled: boolean; description?: string; createdAt: string; [key: string]: unknown; }

export function FeatureFlagsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['feature-flags'], queryFn: async () => { const r = await fetch('/api/v1/feature-flags', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []) as Item[]; } });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/feature-flags', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flag created'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/feature-flags/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }).catch(() => null); if (!r || !r.ok) { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flag updated'); return; } return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/feature-flags/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flags deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkEnableMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/feature-flags/bulk/enable', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flags enabled'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDisableMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/feature-flags/bulk/disable', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flags disabled'); }, onError: (e: Error) => toast.error(e.message) });

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

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Feature Flags</h1>
      <Button onClick={() => { setDialogOpen(true); }}><Flag size={16} className="mr-1" /> Add Flag</Button></div>
    <DataGrid columns={columns} data={data || []} title="Feature Flags" enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No feature flags found."
      bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
        { label: 'Delete', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Delete ${ids.length} flags?`)) bulkDeleteMutation.mutate(ids); } },
        { label: 'Enable', icon: <ToggleLeft size={14} />, onClick: (ids) => bulkEnableMutation.mutate(ids) },
        { label: 'Disable', icon: <ToggleLeft size={14} />, onClick: (ids) => bulkDisableMutation.mutate(ids) },
      ]} />} />
    <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen}
      title="Create Feature Flag" fields={formFields} initialValues={{ isEnabled: false }}
      onSubmit={async (v) => { await createMutation.mutateAsync(v); setDialogOpen(false); }} isPending={createMutation.isPending} />
  </div>);
}

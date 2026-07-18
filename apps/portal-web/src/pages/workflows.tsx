import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Workflow, Trash } from 'lucide-react';
import { CrudDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions } from '../components/bulk-actions';

interface Item { id: string; name: string; type: string; status: string; trigger?: string; createdAt: string; [key: string]: unknown; }

export function WorkflowsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['workflows'], queryFn: async () => { const r = await fetch('/api/v1/workflows', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []) as Item[]; } });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow created'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/workflows/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflows deleted'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' }, { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'status', header: 'Status' }, { accessorKey: 'trigger', header: 'Trigger' },
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Name', required: true }, { name: 'type', label: 'Type' },
    { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }, { label: 'Draft', value: 'DRAFT' }] },
  ], []);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Workflows</h1>
      <Button onClick={() => { setDialogOpen(true); }}><Workflow size={16} className="mr-1" /> Add Workflow</Button></div>
    <DataGrid columns={columns} data={data || []} title="Workflows" enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No workflows found."
      bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
        { label: 'Delete', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Delete ${ids.length} workflows?`)) bulkDeleteMutation.mutate(ids); } },
      ]} />} />
    <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen}
      title="Create Workflow" fields={formFields} initialValues={{ status: 'DRAFT' }}
      onSubmit={async (v) => { await createMutation.mutateAsync(v); setDialogOpen(false); }} isPending={createMutation.isPending} />
  </div>);
}

import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Play, Clock, Trash } from 'lucide-react';
import { CrudDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions } from '../components/bulk-actions';

interface Item { id: string; name: string; type: string; cronExpression: string; isActive: boolean; config?: any; createdAt: string; [key: string]: unknown; }

export function ScheduledJobsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['scheduled-jobs'], queryFn: async () => { const r = await fetch('/api/v1/scheduled-jobs', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []) as Item[]; } });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/scheduled-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['scheduled-jobs'] }); toast.success('Job created'); }, onError: (e: Error) => toast.error(e.message) });
  const triggerMutation = useMutation({ mutationFn: async (jobId: string) => { const r = await fetch('/api/v1/scheduled-jobs/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ jobId }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { toast.success('Job triggered'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/scheduled-jobs/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['scheduled-jobs'] }); toast.success('Jobs deleted'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'cronExpression', header: 'Cron' },
    { accessorKey: 'isActive', header: 'Active', cell: ({ getValue }) => getValue() ? '✅' : '❌' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <button className="p-1 hover:text-primary transition-colors" title="Trigger Now" onClick={() => triggerMutation.mutate(row.original.id)}><Play size={14} /></button>
    )},
  ], [triggerMutation]);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Job Name', required: true },
    { name: 'type', label: 'Type', type: 'select', options: [{ label: 'Script', value: 'SCRIPT' }, { label: 'Webhook', value: 'WEBHOOK' }, { label: 'Task', value: 'TASK' }] },
    { name: 'cronExpression', label: 'Cron Expression', placeholder: '0 0 * * *' },
    { name: 'isActive', label: 'Active', type: 'boolean' },
  ], []);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Scheduled Jobs</h1>
      <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}><Clock size={16} className="mr-1" /> Add Job</Button></div>
    <DataGrid columns={columns} data={data || []} title="Scheduled Jobs" enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No scheduled jobs found."
      bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
        { label: 'Delete', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Delete ${ids.length} jobs?`)) bulkDeleteMutation.mutate(ids); } },
      ]} />} />
    <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen}
      title="Create Scheduled Job" fields={formFields} initialValues={{ isActive: true, type: 'SCRIPT' }}
      onSubmit={async (v) => { await createMutation.mutateAsync(v); setDialogOpen(false); }} isPending={createMutation.isPending} />
  </div>);
}

import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { HardDrive } from 'lucide-react';
import { CrudDialog, type CrudField } from '../components/crud-dialog';

interface Item { id: string; name: string; provider: string; isPublic: boolean; createdAt: string; [key: string]: unknown; }

export function StoragePage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['storage-buckets'], queryFn: async () => { const r = await fetch('/api/v1/storage/buckets', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []) as Item[]; } });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/storage/buckets', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['storage-buckets'] }); toast.success('Bucket created'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'provider', header: 'Provider' },
    { accessorKey: 'isPublic', header: 'Public', cell: ({ getValue }) => getValue() ? '✅' : '❌' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
  ], []);
  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Bucket Name', required: true },
    { name: 'provider', label: 'Provider', type: 'select', options: [{ label: 'Local', value: 'LOCAL' }, { label: 'S3', value: 'S3' }, { label: 'GCS', value: 'GCS' }] },
    { name: 'isPublic', label: 'Public Access', type: 'boolean' },
  ], []);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Storage</h1>
      <Button onClick={() => setDialogOpen(true)}><HardDrive size={16} className="mr-1" /> Create Bucket</Button></div>
    <DataGrid columns={columns} data={data || []} title="Storage" enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No storage found." />
    <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen}
      title="Create Storage Bucket" fields={formFields} initialValues={{ provider: 'LOCAL', isPublic: false }}
      onSubmit={async (v) => { await createMutation.mutateAsync(v); setDialogOpen(false); }} isPending={createMutation.isPending} />
  </div>);
}

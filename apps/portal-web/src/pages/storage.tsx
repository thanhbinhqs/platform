import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Download, Eye, HardDrive, Trash2 } from 'lucide-react';
import { CrudDialog, type CrudField } from '../components/crud-dialog';

interface Item { id: string; name: string; provider: string; isPublic: boolean; createdAt: string; [key: string]: unknown; }

export function StoragePage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<any[]>([]);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['storage-buckets', page, pageSize, debouncedSearch, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sorting.length > 0) { params.set('sortField', sorting[0].id); params.set('sortDir', sorting[0].desc ? 'desc' : 'asc'); }
      const r = await fetch(`/api/v1/storage/buckets?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/storage/buckets', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['storage-buckets'] }); toast.success('Bucket created'); }, onError: (e: Error) => toast.error(e.message) });
  const contextMenuItems = useMemo(() => [
    { label: 'View', icon: <Eye size={14} />, action: 'view' },
    { label: 'Download', icon: <Download size={14} />, action: 'download' },
    { divider: true },
    { label: 'Delete', icon: <Trash2 size={14} />, action: 'delete' },
  ], []);

      const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'view': toast.info(`View bucket: ${row.name || row.id}`); break;
      case 'download': toast.info(`Download bucket: ${row.name || row.id}`); break;
      case 'delete': setDeleteItem(row); break;
    }
  }, [toast]);


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
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Storage</h1>
      <Button onClick={() => setDialogOpen(true)}><HardDrive size={16} className="mr-1" /> Create Bucket</Button></div>
    <DataGrid enableSearch columns={columns} data={data?.items || []} title="Storage" enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No storage found."
      total={data?.total || 0}
      serverSide={serverSide}
      contextMenuItems={contextMenuItems}
      onContextMenuAction={handleContextMenuAction} />
    <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen}
      title="Create Storage Bucket" fields={formFields} initialValues={{ provider: 'LOCAL', isPublic: false }}
      onSubmit={async (v) => { await createMutation.mutateAsync(v); setDialogOpen(false); }} isPending={createMutation.isPending} />
  </div>);
}

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Trash, FileText } from 'lucide-react';
import { Eye, Pencil, XCircle } from 'lucide-react';
import { CrudDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions } from '../components/bulk-actions';

interface Item { id: string; orderNumber: string; customerName: string; items: any[]; total: number; status: string; createdAt: string; [key: string]: unknown; }

export function OrdersPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<any[]>([]);
  const [editItem, setEditItem] = useState<Item | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, pageSize, debouncedSearch, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sorting.length > 0) { params.set('sortField', sorting[0].id); params.set('sortDir', sorting[0].desc ? 'desc' : 'asc'); }
      const r = await fetch(`/api/v1/sales/orders?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/sales/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Order created'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/sales/orders/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Orders cancelled'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/sales/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Order updated'); }, onError: (e: Error) => toast.error(e.message) });
  const contextMenuItems = useMemo(() => [
    { label: 'View', icon: <Eye size={14} />, action: 'view' },
    { label: 'Edit', icon: <Pencil size={14} />, action: 'edit' },
    { label: 'Cancel', icon: <XCircle size={14} />, action: 'cancel', disabled: (r: any) => r.status === 'CANCELLED' || r.status === 'DELIVERED' },
  ], []);

      const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'view': toast.info(`View order: ${row.orderNumber || row.id}`); break;
      case 'edit': setEditItem(row); setDialogOpen(true); break;
      case 'cancel': if (confirm(`Cancel order ${row.orderNumber || row.id}?`)) bulkDeleteMutation.mutate([row.id]); break;
    }
  }, [bulkDeleteMutation, toast, setEditItem, setDialogOpen]);


  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'orderNumber', header: 'Order #' }, { accessorKey: 'customerName', header: 'Customer' },
    { accessorKey: 'items.length', header: 'Items' },
    { accessorKey: 'total', header: 'Total', cell: ({ getValue }) => `$${Number(getValue()).toFixed(2)}` },
    { accessorKey: 'status', header: 'Status' },
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'customerName', label: 'Customer Name', required: true },
    { name: 'items', label: 'Items (JSON)', type: 'textarea' },
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
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Orders</h1>
      <Button onClick={() => { setDialogOpen(true); }}><FileText size={16} className="mr-1" /> Add Order</Button></div>
    <DataGrid enableSearch columns={columns} data={data?.items || []} title="Orders" enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No orders found."
      total={data?.total || 0}
      serverSide={serverSide}
      bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
        { label: 'Cancel', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Cancel ${ids.length} orders?`)) bulkDeleteMutation.mutate(ids); } },
      ]} />}
        contextMenuItems={contextMenuItems} onContextMenuAction={handleContextMenuAction} />
        <CrudDialog open={dialogOpen || !!editItem} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
      title={editItem ? "Edit Order" : "Order"} fields={formFields}
      initialValues={editItem || {}}
      onSubmit={async (v) => { if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, ...v }); setEditItem(null); } else { await createMutation.mutateAsync(v); } setDialogOpen(false); }} isPending={createMutation.isPending || updateMutation.isPending} />
  </div>);
}

import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Eye, ShoppingCart } from 'lucide-react';
import { CrudDialog, type CrudField } from '../components/crud-dialog';

interface Order { id: string; orderNumber: string; customerName: string; total: number; status: string; createdAt: string; [key: string]: unknown; }

export function OrdersPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Order[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Order | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusItem, setStatusItem] = useState<Order | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: async () => { const r = await fetch('/api/v1/sales/orders', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []) as Order[]; } });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/sales/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Order updated'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Order>[]>(() => [
    { accessorKey: 'orderNumber', header: 'Order #' },
    { accessorKey: 'customerName', header: 'Customer' },
    { accessorKey: 'total', header: 'Total', cell: ({ getValue }) => `$${Number(getValue()).toFixed(2)}` },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'createdAt', header: 'Date', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button className="p-1 hover:text-primary" title="View" onClick={() => { setDetailItem(row.original); setDrawerOpen(true); }}><Eye size={14} /></button>
        <button className="p-1 hover:text-amber-500" title="Update Status" onClick={() => { setStatusItem(row.original); setStatusDialogOpen(true); }}><ShoppingCart size={14} /></button>
      </div>
    )},
  ], []);
  const statusFields: CrudField[] = useMemo(() => [
    { name: 'status', label: 'Status', type: 'select', required: true, options: [
      { label: 'Pending', value: 'PENDING' }, { label: 'Confirmed', value: 'CONFIRMED' },
      { label: 'Processing', value: 'PROCESSING' }, { label: 'Shipped', value: 'SHIPPED' },
      { label: 'Delivered', value: 'DELIVERED' }, { label: 'Cancelled', value: 'CANCELLED' },
    ]},
  ], []);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Orders</h1></div>
    <DataGrid columns={columns} data={data || []} title="Orders" enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No orders found." />
    <CrudDialog open={statusDialogOpen} onOpenChange={(o) => { if (!o) setStatusItem(null); setStatusDialogOpen(o); }}
      title={`Update Status: #${statusItem?.orderNumber || ''}`}
      fields={statusFields} initialValues={statusItem || { status: 'PENDING' }}
      onSubmit={async (v) => { if (statusItem) { await updateMutation.mutateAsync({ id: statusItem.id, ...v }); setStatusDialogOpen(false); setStatusItem(null); } }} isPending={updateMutation.isPending} />
  </div>);
}

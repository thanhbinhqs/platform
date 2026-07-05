import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton } from '@platform/ui';
interface Item { id: string; [key: string]: unknown; }
export function OrdersPage() {
  const [selection, setSelection] = useState<Item[]>([]);
  const { data, isLoading } = useQuery({ queryKey: ['sales-orders'], queryFn: async () => { const r = await fetch('/api/v1/sales/orders', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []); } });
  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'orderNumber', header: 'Order #' },
    { accessorKey: 'customerName', header: 'Customer' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'total', header: 'Total ($)', cell: ({ getValue }) => `${Number(getValue()).toFixed(2)}` },
    { accessorKey: 'createdAt', header: 'Date', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
  ], []);
  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden"><h1 className="text-2xl font-bold">Orders</h1>
    <DataGrid columns={columns} data={data || []} title="Orders" enableSorting enableColumnVisibility enableExport enableDensity onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No orders found." />
  </div>);
}
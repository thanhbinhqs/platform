import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton } from '@platform/ui';
interface Item { id: string; [key: string]: unknown; }
export function ProductsPage() {
  const [selection, setSelection] = useState<Item[]>([]);
  const { data, isLoading } = useQuery({ queryKey: ['sales-products'], queryFn: async () => { const r = await fetch('/api/v1/sales/products', { headers: { 'Content-Type': 'application/json' } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []); } });
  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'price', header: 'Price ($)', cell: ({ getValue }) => `${Number(getValue()).toFixed(2)}` },
    { accessorKey: 'stock', header: 'Stock' },
  ], []);
  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Products</h1>
    <DataGrid columns={columns} data={data || []} title="Products" enableSorting enableColumnVisibility enableExport enableDensity onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No products found." />
  </div>);
}
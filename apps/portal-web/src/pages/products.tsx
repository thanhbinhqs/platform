import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Pencil, Trash2, Package } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';

interface Product { id: string; name: string; price: number; stock: number; category?: string; isActive: boolean; createdAt: string; [key: string]: unknown; }

export function ProductsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [deleteItem, setDeleteItem] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: async () => { const r = await fetch('/api/v1/sales/products', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []) as Product[]; } });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/sales/products', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product created'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/sales/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated'); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/sales/products/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Product>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'price', header: 'Price', cell: ({ getValue }) => `$${Number(getValue()).toFixed(2)}` },
    { accessorKey: 'stock', header: 'Stock' },
    { accessorKey: 'category', header: 'Category', cell: ({ getValue }) => (getValue() as string) || '—' },
    { accessorKey: 'isActive', header: 'Active', cell: ({ getValue }) => getValue() ? '✅' : '❌' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button className="p-1 hover:text-primary" title="Edit" onClick={() => { setEditItem(row.original); setDialogOpen(true); }}><Pencil size={14} /></button>
        <button className="p-1 hover:text-red-500" title="Delete" onClick={() => setDeleteItem(row.original)}><Trash2 size={14} /></button>
      </div>
    )},
  ], []);
  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Product Name', required: true },
    { name: 'price', label: 'Price', type: 'number', required: true },
    { name: 'stock', label: 'Stock', type: 'number' },
    { name: 'category', label: 'Category' },
    { name: 'isActive', label: 'Active', type: 'boolean' },
  ], []);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Products</h1>
      <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}><Package size={16} className="mr-1" /> Add Product</Button></div>
    <DataGrid columns={columns} data={data || []} title="Products" enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No products found." />
    <CrudDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
      title={editItem ? `Edit Product: ${editItem.name}` : 'Create Product'}
      fields={formFields} initialValues={editItem || { isActive: true, price: 0, stock: 0 }}
      onSubmit={async (v) => { if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, ...v }); } else { await createMutation.mutateAsync(v); } setDialogOpen(false); setEditItem(null); }} isPending={createMutation.isPending || updateMutation.isPending} />
    <ConfirmDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
      title="Delete Product" message={`Delete "${deleteItem?.name}"?`}
      onConfirm={async () => { await deleteMutation.mutateAsync(deleteItem!.id); setDeleteItem(null); }} isPending={deleteMutation.isPending} />
  </div>);
}

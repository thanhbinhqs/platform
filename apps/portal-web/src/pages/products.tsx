import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Package, Pencil, Trash, Filter, X } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions } from '../components/bulk-actions';
import { FilterSidebar, type FilterField, type ActiveFilter } from '../components/filter-sidebar';

interface Item { id: string; name: string; sku: string; price: number; stock: number; status: string; createdAt: string; [key: string]: unknown; }

export function ProductsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<any[]>([]);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, pageSize, debouncedSearch, sorting, activeFilters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sorting.length > 0) { params.set('sortField', sorting[0].id); params.set('sortDir', sorting[0].desc ? 'desc' : 'asc'); }
      activeFilters.filter(f => f.value !== '' && f.value !== undefined && f.value !== null).forEach(f => {
        params.set(`filter[${f.field}]`, String(f.value));
      });
      const r = await fetch(`/api/v1/sales/products?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/sales/products', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product created'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/sales/products/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Products archived'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/sales/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated'); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/sales/products/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const archiveProduct = useCallback((row: Item) => { if (confirm(`Archive product ${row.name}?`)) bulkDeleteMutation.mutate([row.id]); }, [bulkDeleteMutation]);
  const contextMenuItems = useMemo(() => [
    { label: 'Edit', icon: <Pencil size={14} />, action: 'edit' },
    { label: 'Archive', icon: <Package size={14} />, action: 'archive', disabled: (r: any) => r.status === 'ARCHIVED' },
    { divider: true },
    { label: 'Delete', icon: <Trash size={14} />, action: 'delete' },
  ], []);

      const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'edit': setEditItem(row); setDialogOpen(true); break;
      case 'archive': archiveProduct(row); break;
      case 'delete': setDeleteItem(row); break;
    }
  }, [setEditItem, setDialogOpen, archiveProduct, setDeleteItem]);


  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' }, { accessorKey: 'sku', header: 'SKU' },
    { accessorKey: 'price', header: 'Price', cell: ({ getValue }) => `$${Number(getValue()).toFixed(2)}` },
    { accessorKey: 'stock', header: 'Stock' }, { accessorKey: 'status', header: 'Status' },
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Name', required: true }, { name: 'sku', label: 'SKU', required: true },
    { name: 'price', label: 'Price', type: 'number' }, { name: 'stock', label: 'Stock', type: 'number' },
  ], []);

  const filterFields: FilterField[] = useMemo(() => [
    { id: 'name', label: 'Name', type: 'text' },
    { id: 'sku', label: 'SKU', type: 'text' },
    { id: 'price', label: 'Price', type: 'number-range' },
    { id: 'stock', label: 'Stock', type: 'number-range' },
    { id: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Draft', value: 'DRAFT' }, { label: 'Archived', value: 'ARCHIVED' }] },
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
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Products</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(s => !s)}><Filter size={16} /> {showFilters ? 'Hide Filters' : 'Filters'}</Button>
        <Button onClick={() => { setDialogOpen(true); }}><Package size={16} className="mr-1" /> Add Product</Button>
      </div></div>
    <div className="flex flex-1 gap-4 overflow-hidden">
      <FilterSidebar filterFields={filterFields} activeFilters={activeFilters} onActiveFiltersChange={(f) => { setActiveFilters(f); setPage(0); }} searchQuery={search} onSearchChange={handleGlobalFilterChange} show={showFilters} onToggle={setShowFilters} />
      <div className="flex-1 overflow-auto">
    <DataGrid enableSearch columns={columns} data={data?.items || []} title="Products" enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No products found."
      total={data?.total || 0}
      serverSide={serverSide}
      bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
        { label: 'Archive', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Archive ${ids.length} products?`)) bulkDeleteMutation.mutate(ids); } },
      ]} />}
        contextMenuItems={contextMenuItems} onContextMenuAction={handleContextMenuAction} />
      </div>
    </div>
    <CrudDialog open={dialogOpen || !!editItem} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
      title={editItem ? "Edit Product" : "Create Product"} fields={formFields}
      initialValues={editItem || { price: 0, stock: 0 }}
      onSubmit={async (v) => { if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, ...v }); setEditItem(null); } else { await createMutation.mutateAsync(v); } setDialogOpen(false); }} isPending={createMutation.isPending || updateMutation.isPending} />
    <ConfirmDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
      title="Delete Product" message={`Are you sure you want to delete ${deleteItem?.name}?`}
      onConfirm={async () => { await deleteMutation.mutateAsync(deleteItem!.id); setDeleteItem(null); }}
      isPending={deleteMutation.isPending} />
  </div>);
}

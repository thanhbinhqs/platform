import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Receipt, Upload, RefreshCw, Trash2, Eye, Send, Trash } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';
import { AppDataGrid } from '../components/app-data-grid';

interface Item { id: string; invoiceNumber: string; orderId: string; amount: number; status: string; dueDate: string; createdAt: string; [key: string]: unknown; }

export function InvoicesPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, pageSize, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const r = await fetch(`/api/v1/sales/invoices?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/sales/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice created'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/sales/invoices/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoices cancelled'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/sales/invoices/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice updated'); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/sales/invoices/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const contextMenuItems = useMemo(() => [
    { label: 'View', icon: <Eye size={14} />, action: 'view' },
    { label: 'Send Reminder', icon: <Send size={14} />, action: 'send', disabled: (r: any) => r.status === 'PAID' || r.status === 'CANCELLED' },
    { divider: true },
    { label: 'Delete', icon: <Trash2 size={14} />, action: 'delete' },
  ], []);

  const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'view': toast.info(`View invoice: ${row.invoiceNumber || row.id}`); break;
      case 'send': toast.info(`Send reminder: ${row.invoiceNumber || row.id}`); break;
      case 'delete': setDeleteItem(row); break;
    }
  }, [setEditItem, setDialogOpen, setDeleteItem]);

  const columns = useMemo<any>(() => [
    { accessorKey: 'invoiceNumber', header: 'Invoice #' },
    { accessorKey: 'amount', header: 'Amount', cell: (info: any) => `$${Number(info.getValue()).toFixed(2)}` },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'dueDate', header: 'Due Date', cell: (info: any) => new Date(info.getValue() as string).toLocaleDateString() },
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'orderId', label: 'Order ID' },
    { name: 'amount', label: 'Amount', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Sent', value: 'SENT' }, { label: 'Paid', value: 'PAID' }, { label: 'Overdue', value: 'OVERDUE' }, { label: 'Cancelled', value: 'CANCELLED' }] },
  ], []);

  const filterFields = useMemo(() => [
    { id: 'invoiceNumber', label: 'Invoice #', type: 'text' as const },
    { id: 'orderId', label: 'Order ID', type: 'text' as const },
    { id: 'amount', label: 'Amount', type: 'number-range' as const },
    { id: 'status', label: 'Status', type: 'select' as const, options: [{ label: 'Sent', value: 'SENT' }, { label: 'Paid', value: 'PAID' }, { label: 'Overdue', value: 'OVERDUE' }, { label: 'Cancelled', value: 'CANCELLED' }] },
    { id: 'dueDate', label: 'Due Date', type: 'date-range' as const },
  ], []);

  const handlePaginationChange = useCallback((p: { pageIndex: number; pageSize: number }) => {
    setPage(p.pageIndex);
    setPageSize(p.pageSize);
  }, []);

  const serverSide = useMemo(() => ({
    manualPagination: true as const,
    pageCount: Math.ceil((data?.total || 0) / pageSize),
    pagination: { pageIndex: page, pageSize },
    onPaginationChange: handlePaginationChange,
  }), [page, pageSize, data?.total, handlePaginationChange]);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col">
    <AppDataGrid
      columns={columns} data={data?.items || []} title="Invoices"
      enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber
      onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]}
      emptyMessage="No invoices found."
      total={data?.total || 0}
      serverSide={serverSide}
      filterFields={filterFields}
      bulkActions={[
        { label: 'Cancel', icon: <Trash size={14} />, onClick: (ids: string[]) => { if (confirm(`Cancel ${ids.length} invoices?`)) bulkDeleteMutation.mutate(ids); } },
      ]}
      tableActions={[
        { label: 'Add Invoice', icon: <Receipt size={14} />, onClick: () => { setEditItem(null); setDialogOpen(true); }, variant: 'primary' as const },
        { label: 'Import', icon: <Upload size={14} />, onClick: () => toast.info('Import dialog') },
        { label: 'Sync', icon: <RefreshCw size={14} />, onClick: () => toast.info('Syncing...') },
      ]}
      contextMenuItems={contextMenuItems} onContextMenuAction={handleContextMenuAction}
    />
    <CrudDialog open={dialogOpen || !!editItem} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
      title={editItem ? "Edit Invoice" : "Create Invoice"} fields={formFields}
      initialValues={editItem || { status: 'SENT' }}
      onSubmit={async (v) => { if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, ...v }); setEditItem(null); } else { await createMutation.mutateAsync(v); } setDialogOpen(false); }} isPending={createMutation.isPending || updateMutation.isPending} />
    <ConfirmDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
      title="Delete Invoice" message={`Are you sure you want to delete invoice ${deleteItem?.invoiceNumber}?`}
      onConfirm={async () => { await deleteMutation.mutateAsync(deleteItem!.id); setDeleteItem(null); }}
      isPending={deleteMutation.isPending} />
  </div>);
}

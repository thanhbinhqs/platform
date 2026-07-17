import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { DollarSign, Eye } from 'lucide-react';
import { CrudDialog, type CrudField } from '../components/crud-dialog';

interface Invoice { id: string; invoiceNumber: string; customerName: string; amount: number; paidAmount: number; status: string; dueDate: string; createdAt: string; [key: string]: unknown; }

export function InvoicesPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Invoice[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentItem, setPaymentItem] = useState<Invoice | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: async () => { const r = await fetch('/api/v1/sales/invoices', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []) as Invoice[]; } });
  const payMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/sales/invoices/${id}/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Payment recorded'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Invoice>[]>(() => [
    { accessorKey: 'invoiceNumber', header: 'Invoice #' },
    { accessorKey: 'customerName', header: 'Customer' },
    { accessorKey: 'amount', header: 'Amount', cell: ({ getValue }) => `$${Number(getValue()).toFixed(2)}` },
    { accessorKey: 'paidAmount', header: 'Paid', cell: ({ getValue }) => `$${Number(getValue()).toFixed(2)}` },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'dueDate', header: 'Due', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
    { id: 'actions', header: '', cell: ({ row }) => (
      <button className="p-1 hover:text-emerald-500" title="Record Payment" onClick={() => { setPaymentItem(row.original); setPaymentDialogOpen(true); }}><DollarSign size={14} /></button>
    )},
  ], []);
  const paymentFields: CrudField[] = useMemo(() => [
    { name: 'amount', label: 'Payment Amount', type: 'number', required: true },
  ], []);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Invoices</h1></div>
    <DataGrid columns={columns} data={data || []} title="Invoices" enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No invoices found." />
    <CrudDialog open={paymentDialogOpen} onOpenChange={(o) => { if (!o) setPaymentItem(null); setPaymentDialogOpen(o); }}
      title={`Record Payment — ${paymentItem?.invoiceNumber || ''}`}
      fields={paymentFields} initialValues={{ amount: paymentItem?.amount || 0 }}
      onSubmit={async (v) => { if (paymentItem) { await payMutation.mutateAsync({ id: paymentItem.id, ...v }); setPaymentDialogOpen(false); setPaymentItem(null); } }} isPending={payMutation.isPending} />
  </div>);
}

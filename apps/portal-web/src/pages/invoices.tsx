import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';
import { useState } from 'react';

const invColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500', SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700', PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  OVERDUE: 'bg-red-100 text-red-700', CANCELLED: 'bg-gray-100 text-gray-500',
  REFUNDED: 'bg-red-100 text-red-700',
};

export function InvoicesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['sales-invoices', filter],
    queryFn: async () => { const r = await apiClient.get(`/sales/invoices${filter ? `?status=${filter}` : ''}`); const d = r.data.data || r.data; return { data: (d.data || d) as any[], total: d.total || 0 }; },
  });
  const invoices = data?.data ?? [];
  const [payAmount, setPayAmount] = useState('');
  const [payInvId, setPayInvId] = useState('');

  const recordPayment = useMutation({
    mutationFn: ({ invoiceId, amount }: { invoiceId: string; amount: number }) => apiClient.post('/sales/payments', { invoiceId, amount, method: 'BANK_TRANSFER' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-invoices'] }); toast.success('Payment recorded'); setPayInvId(''); setPayAmount(''); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🧾 Invoices ({data?.total ?? 0})</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {['', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'].map(s => (
          <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>{s || 'All'}</Button>
        ))}
      </div>
      {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />) :
        invoices.map((inv: any) => (
          <Card key={inv.id}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    Order: {inv.order?.orderNumber || '—'} · {inv.order?.customerName || ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Amount: ${Number(inv.amount).toFixed(2)} · Paid: ${Number(inv.paidAmount).toFixed(2)} · Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                  </p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${invColors[inv.status] || ''}`}>{inv.status}</span>
              </div>
              {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" className="h-9 w-32 rounded-md border border-input bg-background px-3 text-sm" placeholder="Amount" value={payInvId === inv.id ? payAmount : ''} onChange={e => { setPayInvId(inv.id); setPayAmount(e.target.value); }} />
                  <Button size="sm" onClick={() => recordPayment.mutate({ invoiceId: inv.id, amount: Number(payAmount) })} disabled={!payAmount || payInvId !== inv.id}>Record Payment</Button>
                </div>
              )}
              {inv.payments?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {inv.payments.map((p: any) => (
                    <p key={p.id} className="text-xs text-muted-foreground">${Number(p.amount).toFixed(2)} · {p.method} · {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ''} {p.transactionId ? `· TX: ${p.transactionId}` : ''}</p>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
    </div>
  );
}
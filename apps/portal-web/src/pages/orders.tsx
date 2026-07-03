import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700', CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700', SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-500',
};

export function OrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['sales-orders', filter],
    queryFn: async () => { const r = await apiClient.get(`/sales/orders${filter ? `?status=${filter}` : ''}`); const d = r.data.data || r.data; return { data: (d.data || d) as any[], total: d.total || 0 }; },
  });
  const { data: productsData } = useQuery({ queryKey: ['sales-products-list'], queryFn: async () => { const r = await apiClient.get('/sales/products?limit=200'); const d = r.data.data || r.data; return (d.data || d) as any[]; } });
  const products = Array.isArray(productsData) ? productsData : [];
  const orders = data?.data ?? [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ customerName: '', customerEmail: '', items: [{ productId: '', quantity: 1 }] });

  const create = useMutation({
    mutationFn: () => apiClient.post('/sales/orders', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-orders'] }); toast.success('Order created'); setShowForm(false); },
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiClient.put(`/sales/orders/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-orders'] }); toast.success('Status updated'); },
  });

  const addItem = () => setForm({...form, items: [...form.items, { productId: '', quantity: 1 }]});
  const updateItem = (i: number, field: string, val: any) => {
    const items = [...form.items];
    items[i] = {...items[i], [field]: val};
    setForm({...form, items});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🛒 Orders ({data?.total ?? 0})</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'New Order'}</Button>
      </div>
      {showForm && (
        <Card><div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Customer Name</Label><Input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} /></div>
            <div><Label>Email</Label><Input value={form.customerEmail} onChange={e => setForm({...form, customerEmail: e.target.value})} /></div>
          </div>
          <p className="text-sm font-medium">Items</p>
          {form.items.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <select className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)}>
                <option value="">Select product</option>
                {products.filter((p: any) => p.status === 'ACTIVE').map((p: any) => <option key={p.id} value={p.id}>{p.name} (${Number(p.price).toFixed(2)})</option>)}
              </select>
              <Input type="number" className="w-20" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} min={1} />
              {i === form.items.length - 1 && <Button size="sm" variant="outline" onClick={addItem}>+</Button>}
            </div>
          ))}
          <Button onClick={() => create.mutate()} disabled={!form.customerName || !form.items[0]?.productId}>Create Order</Button>
        </div></Card>
      )}
      <div className="flex flex-wrap gap-2">
        {['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
          <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>{s || 'All'}</Button>
        ))}
      </div>
      {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />) :
        orders.map((o: any) => (
          <Card key={o.id}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{o.orderNumber} — {o.customerName || 'Guest'}</p>
                  <p className="text-xs text-muted-foreground">${Number(o.total).toFixed(2)} · {o.items?.length || 0} items{o.customerEmail ? ` · ${o.customerEmail}` : ''}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[o.status] || ''}`}>{o.status}</span>
              </div>
              <div className="mt-2 flex gap-1">
                {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].filter(s => {
                  const m: Record<string, string[]> = { PENDING: ['CONFIRMED','CANCELLED'], CONFIRMED: ['PROCESSING','CANCELLED'], PROCESSING: ['SHIPPED','CANCELLED'], SHIPPED: ['DELIVERED','CANCELLED'], DELIVERED: ['REFUNDED'], CANCELLED: [], REFUNDED: [] };
                  return m[o.status]?.includes(s);
                }).map(s => (
                  <Button key={s} size="sm" variant="outline" className="text-xs" onClick={() => updateStatus.mutate({ id: o.id, status: s })}>{s}</Button>
                ))}
              </div>
              {o.invoice && <p className="mt-1 text-xs text-muted-foreground">Invoice: {o.invoice.invoiceNumber} · {o.invoice.status}</p>}
            </div>
          </Card>
        ))}
    </div>
  );
}
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

export function ProductsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['sales-products'], queryFn: async () => { const r = await apiClient.get('/sales/products?limit=100'); const d = r.data.data || r.data; return (d.data || d) as any[]; } });
  const { data: cats } = useQuery({ queryKey: ['sales-categories'], queryFn: async () => { const r = await apiClient.get('/sales/categories'); return (r.data.data || r.data) as any[]; } });
  const categories = Array.isArray(cats) ? cats : [];
  const products = Array.isArray(data) ? data : [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', price: 0, stock: 0, categoryId: '', status: 'ACTIVE' });

  const create = useMutation({
    mutationFn: () => apiClient.post('/sales/products', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-products'] }); toast.success('Product created'); setShowForm(false); setForm({ name: '', sku: '', price: 0, stock: 0, categoryId: '', status: 'ACTIVE' }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => apiClient.put(`/sales/products/${id}`, { status: 'DISCONTINUED' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales-products'] }); toast.success('Product discontinued'); },
  });

  const statusColor: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-700', INACTIVE: 'bg-gray-100 text-gray-500', DRAFT: 'bg-yellow-100 text-yellow-700', DISCONTINUED: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📦 Products ({products.length})</h1>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'New Product'}</Button>
      </div>
      {showForm && (
        <Card><div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} /></div>
            <div><Label>Price</Label><Input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} /></div>
            <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} /></div>
            <div><Label>Category</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
              <option value="">No category</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
            <div><Label>Status</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="INACTIVE">Inactive</option>
            </select></div>
          </div>
          <Button onClick={() => create.mutate()} disabled={!form.name || !form.sku}>Create</Button>
        </div></Card>
      )}
      {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) :
        products.map(p => (
          <Card key={p.id}>
            <div className="flex items-center justify-between p-4">
              <div className="flex-1">
                <p className="font-medium">{p.name} <span className="text-xs text-muted-foreground font-mono">({p.sku})</span></p>
                <p className="text-xs text-muted-foreground">
                  ${Number(p.price).toFixed(2)} · Stock: {p.stock}
                  {p.category?.name ? ` · ${p.category.name}` : ''}
                  {Number(p.stock) <= Number(p.lowStock) && p.status === 'ACTIVE' && <span className="ml-2 text-amber-600 font-medium">Low stock!</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[p.status] || ''}`}>{p.status}</span>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if(confirm(`Discontinue ${p.name}?`)) del.mutate(p.id); }}>Discontinue</Button>
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}
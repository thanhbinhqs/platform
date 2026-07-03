import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

export function WebhooksPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['webhooks'], queryFn: async () => { const r = await apiClient.get('/webhooks'); return (r.data.data || r.data) as any[]; } });
  const del = useMutation({ mutationFn: (id: string) => apiClient.delete(`/webhooks/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook deleted'); } });
  const create = useMutation({ mutationFn: (d: any) => apiClient.post('/webhooks', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); toast.success('Webhook created'); setShowCreate(false); setForm({name:'',url:'',events:[]}); } });
  const items = Array.isArray(data) ? data : [];
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: [] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔗 Webhooks</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'New Webhook'}</Button>
      </div>
      {showCreate && (
        <Card><div className="space-y-3 p-4">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>URL</Label><Input value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." /></div>
          <Button onClick={() => create.mutate(form)} disabled={!form.name || !form.url}>Create</Button>
        </div></Card>
      )}
      {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) :
        items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No webhooks yet.</p> :
        items.map(item => (
          <Card key={item.id}>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.url}</p>
                <p className="text-xs text-muted-foreground">{item.events?.join(', ') || 'all events'}{item._count?.deliveries ? ` · ${item._count.deliveries} deliveries` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.isActive ? 'Active' : 'Inactive'}</span>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if(confirm('Delete?')) del.mutate(item.id); }}>Delete</Button>
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}
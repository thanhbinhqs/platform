import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

export function IntegrationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['integrations'], queryFn: async () => { const r = await apiClient.get('/integrations'); return (r.data.data || r.data) as any[]; } });
  const del = useMutation({ mutationFn: (id: string) => apiClient.delete(`/integrations/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); toast.success('Integration disconnected'); } });
  const create = useMutation({ mutationFn: (d: any) => apiClient.post('/integrations', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); toast.success('Integration created'); setShowCreate(false); setForm({name:'',type:'API'}); } });
  const items = Array.isArray(data) ? data : [];
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'API' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔌 Integrations</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'New Integration'}</Button>
      </div>
      {showCreate && (
        <Card><div className="space-y-3 p-4">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Type</Label><Input value={form.type} onChange={e => setForm({...form, type: e.target.value})} placeholder="API" /></div>
          <Button onClick={() => create.mutate(form)} disabled={!form.name}>Create</Button>
        </div></Card>
      )}
      {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) :
        items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No integrations yet.</p> :
        items.map(item => (
          <Card key={item.id}>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.type} · {item.provider || ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                  item.status === 'CONNECTED' ? 'bg-green-100 text-green-700' :
                  item.status === 'DISCONNECTED' ? 'bg-gray-100 text-gray-500' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{item.status}</span>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if(confirm('Disconnect?')) del.mutate(item.id); }}>Disconnect</Button>
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}
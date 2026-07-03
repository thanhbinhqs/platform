import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

export function RulesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['rules'], queryFn: async () => { const r = await apiClient.get('/rules'); return (r.data.data || r.data) as any[]; } });
  const del = useMutation({ mutationFn: (id: string) => apiClient.delete(`/rules/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); toast.success('Rule disabled'); } });
  const create = useMutation({ mutationFn: (d: any) => apiClient.post('/rules', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); toast.success('Rule created'); setShowCreate(false); setForm({name:'',description:'',event:'user.created'}); } });
  const items = Array.isArray(data) ? data : [];
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', event: 'user.created' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">⚖️ Rules Engine</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'New Rule'}</Button>
      </div>
      {showCreate && (
        <Card><div className="space-y-3 p-4">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Event</Label><Input value={form.event} onChange={e => setForm({...form, event: e.target.value})} placeholder="user.created" /></div>
          <Button onClick={() => create.mutate(form)} disabled={!form.name}>Create</Button>
        </div></Card>
      )}
      {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) :
        items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No rules yet.</p> :
        items.map(item => (
          <Card key={item.id}>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.description || item.event} · {item.status}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.status}</span>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if(confirm('Disable this rule?')) del.mutate(item.id); }}>Disable</Button>
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}
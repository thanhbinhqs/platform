import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

export function FeatureFlagsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['feature-flags'], queryFn: async () => { const r = await apiClient.get('/feature-flags'); return (r.data.data || r.data) as any[]; } });
  const create = useMutation({ mutationFn: (d: any) => apiClient.post('/feature-flags', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flag created'); setShowCreate(false); setForm({name:''}); } });
  const toggle = useMutation({ mutationFn: ({id,enabled}:{id:string,enabled:boolean}) => apiClient.put(`/feature-flags/${id}`, {isActive: enabled}), onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast.success('Flag toggled'); } });
  const items = Array.isArray(data) ? data : [];
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🚩 Feature Flags</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'New Flag'}</Button>
      </div>
      {showCreate && (
        <Card><div className="space-y-3 p-4">
          <div><Label>Flag Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="my-feature" /></div>
          <Button onClick={() => create.mutate({...form, key: form.name, value: 'false', type: 'BOOLEAN'})} disabled={!form.name}>Create</Button>
        </div></Card>
      )}
      {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) :
        items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No feature flags yet.</p> :
        items.map(item => (
          <Card key={item.id}>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{item.key || item.name}</p>
                <p className="text-xs text-muted-foreground">{item.type || 'BOOLEAN'} · {item.description || ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.isActive ? 'ON' : 'OFF'}</span>
                <Button size="sm" variant="outline" onClick={() => toggle.mutate({id: item.id, enabled: !item.isActive})}>
                  {item.isActive ? 'Turn Off' : 'Turn On'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}
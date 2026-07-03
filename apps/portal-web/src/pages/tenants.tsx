import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

export function TenantsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['tenants'], queryFn: async () => { const r = await apiClient.get('/tenants'); return (r.data.data || r.data) as any[]; } });
  const del = useMutation({ mutationFn: (id: string) => apiClient.delete(`/tenants/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); toast.success('Tenant suspended'); } });
  const create = useMutation({ mutationFn: (d: any) => apiClient.post('/tenants', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); toast.success('Tenant created'); setShowCreate(false); setName(''); } });
  const items = Array.isArray(data) ? data : [];
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏢 Tenants</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'New Tenant'}</Button>
      </div>
      {showCreate && (
        <Card><div className="space-y-3 p-4">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <Button onClick={() => create.mutate({ name })} disabled={!name}>Create</Button>
        </div></Card>
      )}
      {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) :
        items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No tenants yet.</p> :
        items.map(item => (
          <Card key={item.id}>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.slug || ''} · {item.domain || 'No domain'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                  item.status === 'SUSPENDED' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{item.status}</span>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if(confirm('Suspend this tenant?')) del.mutate(item.id); }}>Suspend</Button>
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}
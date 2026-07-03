import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

export function StoragePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['storage-buckets'], queryFn: async () => { const r = await apiClient.get('/storage/buckets'); return (r.data.data || r.data) as any[]; } });
  const create = useMutation({ mutationFn: (d: any) => apiClient.post('/storage/buckets', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['storage-buckets'] }); toast.success('Bucket created'); setShowCreate(false); setName(''); } });
  const del = useMutation({ mutationFn: (id: string) => apiClient.delete(`/tenants/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['storage-buckets'] }) });
  const items = Array.isArray(data) ? data : [];
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">💾 Storage</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'New Bucket'}</Button>
      </div>
      {showCreate && (
        <Card><div className="space-y-3 p-4">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <Button onClick={() => create.mutate({ name })} disabled={!name}>Create</Button>
        </div></Card>
      )}
      {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) :
        items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No buckets yet.</p> :
        items.map(b => (
          <Card key={b.id}>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.provider || 'LOCAL'} · {b.isPublic ? 'Public' : 'Private'}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if(confirm('Delete?')) del.mutate(b.id); }}>Delete</Button>
            </div>
          </Card>
        ))}
    </div>
  );
}
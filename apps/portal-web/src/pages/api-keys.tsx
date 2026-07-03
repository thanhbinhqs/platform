import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

export function ApiKeysPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['api-keys'], queryFn: async () => { const r = await apiClient.get('/api-keys'); return (r.data.data || r.data) as any[]; } });
  const create = useMutation({ mutationFn: (d: any) => apiClient.post('/api-keys', d), onSuccess: (resp) => { qc.invalidateQueries({ queryKey: ['api-keys'] }); const d: any = resp.data; setNewKey(d?.data?.rawKey || d?.rawKey || ''); setShowCreate(false); } });
  const del = useMutation({ mutationFn: (id: string) => apiClient.delete(`/api-keys/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['api-keys'] }); toast.success('Key revoked'); } });
  const items = Array.isArray(data) ? data : [];
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔑 API Keys</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'New Key'}</Button>
      </div>
      {newKey && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <div className="p-4">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">⚠️ Key Created — Copy it now!</p>
            <code className="mt-2 block break-all rounded bg-amber-100 dark:bg-amber-900/50 px-3 py-2 text-xs font-mono">{newKey}</code>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Copied!'); }}>Copy</Button>
            <Button size="sm" variant="ghost" className="ml-2" onClick={() => setNewKey('')}>Dismiss</Button>
          </div>
        </Card>
      )}
      {showCreate && (
        <Card><div className="space-y-3 p-4">
          <div><Label>Key Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="My API Key" /></div>
          <Button onClick={() => create.mutate({ name })} disabled={!name}>Generate</Button>
        </div></Card>
      )}
      {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) :
        items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No API keys yet.</p> :
        items.map(item => (
          <Card key={item.id}>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.key}</p>
                <p className="text-xs text-muted-foreground">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm('Revoke this key?')) { del.mutate(item.id); } }}>Revoke</Button>
            </div>
          </Card>
        ))}
    </div>
  );
}
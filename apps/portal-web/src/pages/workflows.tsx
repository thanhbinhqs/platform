import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

interface Workflow {
  id: string; name: string; description: string | null; status: string; triggerType: string;
  version: number; createdAt: string; _count?: { steps: number; executions: number };
}

export function WorkflowsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['workflows'], queryFn: async () => { const r = await apiClient.get('/workflows'); return (r.data.data || r.data) as Workflow[]; } });
  const createWf = useMutation({ mutationFn: (d: any) => apiClient.post('/workflows', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow created'); } });
  const deleteWf = useMutation({ mutationFn: (id: string) => apiClient.delete(`/workflows/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow archived'); } });
  const publishWf = useMutation({ mutationFn: (id: string) => apiClient.post(`/workflows/${id}/publish`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow published'); } });

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState(''); const [desc, setDesc] = useState('');
  const [selected, setSelected] = useState<Workflow | null>(null);

  const handleCreate = async () => {
    await createWf.mutateAsync({ name, description: desc, triggerType: 'MANUAL' });
    setName(''); setDesc(''); setShowCreate(false);
  };

  const workflows = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workflows</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'New Workflow'}</Button>
      </div>
      {showCreate && (
        <Card><CardContent className="space-y-3 pt-4">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Description</Label><Input value={desc} onChange={e => setDesc(e.target.value)} /></div>
          <Button onClick={handleCreate} disabled={!name || createWf.isPending}>Create</Button>
        </CardContent></Card>
      )}
      {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div> :
        workflows.map(w => (
          <Card key={w.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelected(selected?.id === w.id ? null : w)}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{w.name}</p>
                <p className="text-xs text-muted-foreground">{w.description || '—'} · v{w.version} · {w.triggerType}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${w.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : w.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{w.status}</span>
                <span className="text-xs text-muted-foreground">{w._count?.steps || 0} steps</span>
              </div>
            </CardContent>
            {selected?.id === w.id && (
              <div className="flex gap-2 border-t px-4 py-2">
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); publishWf.mutate(w.id); }} disabled={w.status === 'ACTIVE'}>Publish</Button>
                <Button size="sm" variant="outline" className="text-red-500" onClick={(e) => { e.stopPropagation(); if (confirm('Archive this workflow?')) deleteWf.mutate(w.id); }}>Archive</Button>
              </div>
            )}
          </Card>
        ))}
    </div>
  );
}
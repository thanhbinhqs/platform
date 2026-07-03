import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Input, Label, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

export function ScheduledJobsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['scheduled-jobs'], queryFn: async () => { const r = await apiClient.get('/scheduled-jobs'); return (r.data.data || r.data) as any[]; } });
  const trigger = useMutation({ mutationFn: (jobId: string) => apiClient.post('/scheduled-jobs/trigger', { jobId }), onSuccess: () => toast.success('Job triggered') });
  const create = useMutation({ mutationFn: (d: any) => apiClient.post('/scheduled-jobs', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['scheduled-jobs'] }); toast.success('Job created'); setShowCreate(false); setForm({name:'',cronExpression:'0 0 * * *'}); } });
  const items = Array.isArray(data) ? data : [];
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', cronExpression: '0 0 * * *' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">⏰ Scheduled Jobs</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'New Job'}</Button>
      </div>
      {showCreate && (
        <Card><div className="space-y-3 p-4">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Cron Expression</Label><Input value={form.cronExpression} onChange={e => setForm({...form, cronExpression: e.target.value})} placeholder="0 0 * * *" /></div>
          <Button onClick={() => create.mutate(form)} disabled={!form.name}>Create</Button>
        </div></Card>
      )}
      {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) :
        items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No jobs yet.</p> :
        items.map(item => (
          <Card key={item.id}>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.type} · {item.cronExpression || 'manual'}{item._count?.executions ? ` · ${item._count.executions} runs` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.isActive ? 'Active' : 'Inactive'}</span>
                <Button size="sm" variant="outline" onClick={() => trigger.mutate(item.id)} disabled={trigger.isPending}>Run Now</Button>
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}
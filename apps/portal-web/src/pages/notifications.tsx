import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

export function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: async () => { const r = await apiClient.get('/notifications'); return (r.data.data || r.data) as any[]; } });
  const markRead = useMutation({ mutationFn: (id: string) => apiClient.post(`/notifications/read/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Marked as read'); } });
  const items = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🔔 Notifications</h1>
      {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) :
        items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet.</p> :
        items.map(n => (
          <Card key={n.id} className={n.readAt ? '' : 'border-l-4 border-l-primary'}>
            <div className="flex items-start justify-between p-4">
              <div className="flex-1">
                <p className="text-sm font-medium">{n.subject || n.type}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.body?.slice(0, 200) || ''}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.readAt && (
                <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>Mark Read</Button>
              )}
            </div>
          </Card>
        ))}
    </div>
  );
}
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Input, Label,
} from '@platform/ui';
import { useAuthStore, toast } from '@platform/hooks';
import apiClient from '@platform/api-client';
 
 /* ─── Session type ─── */
interface Session {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

/* ─── Queries & Mutations ─── */

function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const r = await apiClient.get('/auth/sessions');
      return (r.data.data || r.data || []) as Session[];
    },
  });
}

function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/auth/sessions/${id}/revoke`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

function useRevokeAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/auth/sessions/revoke-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

/* ─── Helpers ─── */

function formatDevice(ua: string | null, info: string | null): string {
  if (info) return info;
  if (!ua) return 'Unknown device';
  if (ua.includes('Mobile')) return 'Mobile Browser';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  return ua.slice(0, 40);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── Page ─── */

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Change password
  const [cpForm, setCpForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [cpMsg, setCpMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const changePwd = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/auth/change-password', data),
    onSuccess: () => {
      setCpMsg({ type: 'ok', text: 'Password changed successfully' });
      setCpForm({ currentPassword: '', newPassword: '', confirm: '' });
    },
    onError: () => setCpMsg({ type: 'err', text: 'Failed to change password. Check current password.' }),
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setCpMsg(null);
    if (cpForm.newPassword !== cpForm.confirm) {
      setCpMsg({ type: 'err', text: 'Passwords do not match' });
      return;
    }
    if (cpForm.newPassword.length < 8) {
      setCpMsg({ type: 'err', text: 'Password must be at least 8 characters' });
      return;
    }
    changePwd.mutate({ currentPassword: cpForm.currentPassword, newPassword: cpForm.newPassword });
  };

  // Sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const revokeSession = useRevokeSession();
  const revokeAll = useRevokeAll();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* ── Profile ── */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {user?.displayName?.charAt(0)?.toUpperCase() ?? user?.username?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div>
              <p className="text-lg font-medium">{user?.displayName ?? user?.username}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Roles: {user?.roles?.map((r) => r.name).join(', ') || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Change Password ── */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="cp-current">Current Password</Label>
              <Input id="cp-current" type="password" value={cpForm.currentPassword}
                onChange={(e) => setCpForm((f) => ({ ...f, currentPassword: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cp-new">New Password</Label>
              <Input id="cp-new" type="password" value={cpForm.newPassword}
                onChange={(e) => setCpForm((f) => ({ ...f, newPassword: e.target.value }))} required minLength={8} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cp-confirm">Confirm New Password</Label>
              <Input id="cp-confirm" type="password" value={cpForm.confirm}
                onChange={(e) => setCpForm((f) => ({ ...f, confirm: e.target.value }))} required />
            </div>
            {cpMsg && (
              <p className={`text-sm ${cpMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                {cpMsg.text}
              </p>
            )}
            <Button type="submit" disabled={changePwd.isPending}>
              {changePwd.isPending ? 'Changing…' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Multi-Factor Authentication ── */}
      <MfaCard />

      {/* ── Login History ── */}
      <LoginHistoryCard />

      {/* ── Active Sessions ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Sessions</CardTitle>
          {sessions.length > 1 && (
            <Button variant="outline" size="sm" disabled={revokeAll.isPending}
              onClick={() => revokeAll.mutate()}>
              {revokeAll.isPending ? 'Revoking…' : 'Revoke All'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-0">
          {sessionsLoading ? (
            <p className="py-4 text-sm text-muted-foreground">Loading sessions…</p>
          ) : sessions.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No active sessions found. Sessions are created when you log in.
            </p>
          ) : (
            sessions.map((s) => (
              <div key={s.id}
                className="flex items-center justify-between border-b py-3 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium">{formatDevice(s.userAgent, s.deviceInfo)}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.ipAddress && `${s.ipAddress} · `}
                    {formatDate(s.createdAt)}
                    {s.lastActivityAt !== s.createdAt && ` · active ${formatDate(s.lastActivityAt)}`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="text-red-500"
                  disabled={revokeSession.isPending}
                  onClick={() => revokeSession.mutate(s.id)}>
                  Revoke
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Sign Out ── */}
      <div className="text-center">
        <Button variant="outline" onClick={() => { clearAuth(); window.location.href = '/login'; }}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}

/* ─── Login History Card ─── */
function LoginHistoryCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['login-history'],
    queryFn: async () => {
      const r = await apiClient.get('/login-history?limit=10');
      const d = (r.data.data || r.data);
      return { data: d.data ?? [], total: d.total ?? 0 };
    },
  });
  const entries = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {isLoading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No login history yet.</p>
        ) : (
          entries.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
              <span className={`font-medium ${e.status === 'SUCCESS' ? 'text-green-600' : 'text-red-500'}`}>
                {e.status === 'SUCCESS' ? '✓' : '✗'} {e.status.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-muted-foreground">
                {e.ipAddress && `${e.ipAddress} · `}
                {new Date(e.createdAt).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ─── MFA Card ─── */

interface MfaSetupData {
  secret: string;
  qrCode: string;
}

function MfaCard() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [showSetup, setShowSetup] = useState(false);
  const [token, setToken] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');

  // Fetch MFA setup data when user opens setup
  const { data: setupData, isLoading: setupLoading, refetch } = useQuery({
    queryKey: ['mfa-setup'],
    queryFn: async () => {
      const r = await apiClient.get('/mfa/setup');
      const d = (r.data.data || r.data) as MfaSetupData;
      setMfaSecret(d.secret);
      return d;
    },
    enabled: showSetup,
  });

  const enableMfa = useMutation({
    mutationFn: () => apiClient.post('/mfa/enable', { secret: mfaSecret, token }),
    onSuccess: () => {
      toast.success('MFA enabled');
      setShowSetup(false);
      setToken('');
      qc.invalidateQueries({ queryKey: ['mfa-setup'] });
      // Re-fetch user to update isMfaEnabled flag
      useAuthStore.getState().initialize();
    },
    onError: () => toast.error('Invalid code. Try again.'),
  });

  const disableMfa = useMutation({
    mutationFn: () => apiClient.post('/mfa/disable'),
    onSuccess: () => {
      toast.success('MFA disabled');
      useAuthStore.getState().initialize();
    },
    onError: () => toast.error('Failed to disable MFA'),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Multi-Factor Authentication</CardTitle>
        {user?.isMfaEnabled ? (
          <Button variant="outline" size="sm" disabled={disableMfa.isPending}
            onClick={() => disableMfa.mutate()}>
            {disableMfa.isPending ? 'Disabling…' : 'Disable'}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => { setShowSetup(!showSetup); if (!showSetup) refetch(); }}>
            {showSetup ? 'Cancel' : 'Setup'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {user?.isMfaEnabled ? (
          <p className="text-sm text-green-600">MFA is currently enabled for your account.</p>
        ) : showSetup ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan the QR code with your authenticator app, then enter the 6-digit code below.
            </p>
            {setupLoading ? (
              <p className="text-sm">Generating QR code…</p>
            ) : setupData?.qrCode ? (
              <div className="flex justify-center">
                <img src={setupData.qrCode} alt="MFA QR Code"
                  className="h-48 w-48 rounded border" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Secret key: <code className="rounded bg-muted px-2 py-0.5 text-xs">{setupData?.secret ?? mfaSecret}</code>
              </p>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="mfa-token">6-digit code</Label>
                <Input id="mfa-token" placeholder="000000" maxLength={6}
                  value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              </div>
              <Button disabled={token.length !== 6 || enableMfa.isPending}
                onClick={() => enableMfa.mutate()}>
                {enableMfa.isPending ? 'Verifying…' : 'Enable'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            MFA is not enabled. Click <strong>Setup</strong> to add an extra layer of security.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

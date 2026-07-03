import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Skeleton,
} from '@platform/ui';
import apiClient from '@platform/api-client';
import type { User, Role } from '@platform/shared-types';
import { useAuthStore, toast, useMediaQuery } from '@platform/hooks';

/* ---------- Queries ---------- */

function useUsers(page: number = 1, limit: number = 15) {
  return useQuery({
    queryKey: ['users', { page, limit }],
    queryFn: async () => {
      const r = await apiClient.get(`/users?page=${page}&limit=${limit}`);
      const res: { data: User[]; total: number; page: number; limit: number } =
        (r.data.data || r.data);
      return res;
    },
  });
}

function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const r = await apiClient.get('/roles');
      return r.data.data as Role[];
    },
  });
}

/* ---------- Mutations ---------- */

function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; email: string; password: string; roleIds?: string[] }) =>
      apiClient.post('/users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
    },
  });
}

function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; displayName?: string; isActive?: boolean; password?: string; roleIds?: string[] }) =>
      apiClient.put(`/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
    },
  });
}

function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted');
    },
    onError: () => toast.error('Failed to delete user'),
  });
}

/* ---------- Components ---------- */

function RoleSelector({
  selected,
  onChange,
  availableRoles,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  availableRoles: Role[];
}) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((r) => r !== id) : [...selected, id]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {availableRoles.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => toggle(r.id)}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            selected.includes(r.id)
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/40'
          }`}
        >
          {r.name}
        </button>
      ))}
      {availableRoles.length === 0 && (
        <span className="text-xs text-muted-foreground">No roles available</span>
      )}
    </div>
  );
}

function EditUserDialog({
  user,
  open,
  onOpenChange,
  availableRoles,
}: {
  user: User;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  availableRoles: Role[];
}) {
  const updateUser = useUpdateUser();
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [isActive, setIsActive] = useState(user.status === 'ACTIVE');
  const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>(user.roles?.map((r) => r.id) ?? []);
  const [directPerms, setDirectPerms] = useState<
    { permissionId: string; effect: 'ALLOW' | 'DENY' }[]
  >(
    (user as any).directPermissions?.map((dp: any) => ({
      permissionId: dp.id ?? dp.permissionId,
      effect: dp.effect,
    })) ?? [],
  );

  // Fetch all available permissions
  const { data: allPermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const r = await apiClient.get('/permissions');
      return r.data.data as { id: string; name: string; action: string; resource: string }[];
    },
  });

  const toggleDirectPerm = (permissionId: string) => {
    setDirectPerms((prev) => {
      const existing = prev.find((dp) => dp.permissionId === permissionId);
      if (!existing) return [...prev, { permissionId, effect: 'ALLOW' as const }];
      if (existing.effect === 'ALLOW')
        return prev.map((dp) => (dp.permissionId === permissionId ? { ...dp, effect: 'DENY' as const } : dp));
      return prev.filter((dp) => dp.permissionId !== permissionId);
    });
  };

  const getDirectPerm = (permissionId: string) => directPerms.find((dp) => dp.permissionId === permissionId);

  // Reset form when user changes
  useMemo(() => {
    setDisplayName(user.displayName ?? '');
    setIsActive(user.status === 'ACTIVE');
    setPassword('');
    setRoleIds(user.roles?.map((r) => r.id) ?? []);
  }, [user, open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { displayName, isActive };
    if (password) payload.password = password;
    payload.roleIds = roleIds;
    payload.directPermissions = directPerms;
    await updateUser.mutateAsync({ id: user.id, ...payload } as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User — {user.username}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="e-name">Display Name</Label>
            <Input id="e-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-email">Email</Label>
            <Input id="e-email" value={user.email} disabled className="text-muted-foreground" />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">Enable or disable this account</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-password">
              New Password{' '}
              <span className="text-xs text-muted-foreground">(leave blank to keep current)</span>
            </Label>
            <Input
              id="e-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label>Roles</Label>
            <RoleSelector selected={roleIds} onChange={setRoleIds} availableRoles={availableRoles} />
          </div>

          {/* Direct Permissions */}
          <details className="rounded-lg border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              Direct Permissions{' '}
              {directPerms.length > 0 && (
                <span className="ml-1 text-xs text-primary">({directPerms.length} overrides)</span>
              )}
            </summary>
            <div className="max-h-48 space-y-0.5 overflow-y-auto border-t px-3 py-2">
              {allPermissions?.map((perm) => {
                const dp = getDirectPerm(perm.id);
                return (
                  <button
                    key={perm.id}
                    type="button"
                    onClick={() => toggleDirectPerm(perm.id)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors hover:bg-accent ${
                      dp?.effect === 'ALLOW'
                        ? 'text-green-600'
                        : dp?.effect === 'DENY'
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                    }`}
                  >
                    <span>{perm.action}:{perm.resource}</span>
                    <span className="font-medium">
                      {dp?.effect === 'ALLOW' ? '✓ ALLOW' : dp?.effect === 'DENY' ? '✗ DENY' : '—'}
                    </span>
                  </button>
                );
              })}
              {(!allPermissions || allPermissions.length === 0) && (
                <span className="text-xs text-muted-foreground">Loading permissions…</span>
              )}
            </div>
          </details>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  availableRoles,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  availableRoles: Role[];
}) {
  const createUser = useCreateUser();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [roleIds, setRoleIds] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUser.mutateAsync({ ...form, roleIds: roleIds.length > 0 ? roleIds : undefined });
    setForm({ username: '', email: '', password: '' });
    setRoleIds([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>Add User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-username">Username</Label>
            <Input
              id="c-username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-password">Password</Label>
            <Input
              id="c-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label>Roles</Label>
            <p className="text-xs text-muted-foreground">Assign roles (optional)</p>
            <RoleSelector selected={roleIds} onChange={setRoleIds} availableRoles={availableRoles} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Page ---------- */

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isMobile = !useMediaQuery('(min-width: 768px)');
  const [page, setPage] = useState(1);
  const limit = 15;
  const { data: usersRes, isLoading } = useUsers(page, limit);
  const users = usersRes?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((usersRes?.total ?? 0) / limit));
  const { data: roles } = useRoles();
  const deleteUser = useDeleteUser();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage user accounts, roles, and status
          </p>
        </div>
        <CreateUserDialog open={showCreate} onOpenChange={setShowCreate} availableRoles={roles ?? []} />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users?.map((u) => (
            <Card
              key={u.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setEditUser(u)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {u.displayName?.charAt(0)?.toUpperCase() ?? u.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.displayName ?? u.username}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {u.roles?.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                        >
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : u.status === 'LOCKED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {u.status}
                  </span>
                  {currentUser?.id !== u.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete user ${u.username}?`)) {
                          deleteUser.mutate(u.id);
                        }
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {users?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No users yet.</p>
          )}
        </div>
      )}

      {/* Edit dialog */}
      {editUser && (
        <EditUserDialog
          key={editUser.id}
          user={editUser}
          open={!!editUser}
          onOpenChange={(v) => { if (!v) setEditUser(null); }}
          availableRoles={roles ?? []}
        />
      )}
    </div>
  );
}

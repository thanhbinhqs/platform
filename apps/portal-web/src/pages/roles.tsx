import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, Skeleton,
} from '@platform/ui';
import apiClient from '@platform/api-client';
import type { Role, Permission } from '@platform/shared-types';
import { useMediaQuery, toast } from '@platform/hooks';

function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const r = await apiClient.get('/roles');
      return r.data.data as Role[];
    },
  });
}

function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const r = await apiClient.get('/permissions');
      return r.data.data as Permission[];
    },
  });
}

function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient.post('/roles', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created');
    },
  });
}

function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
      apiClient.put(`/roles/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated');
    },
  });
}

function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/roles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted');
    },
    onError: () => toast.error('Failed to delete role'),
  });
}

function useAssignPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: string; permissionIds: string[] }) =>
      apiClient.post(`/roles/${id}/permissions`, { permissionIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Permissions updated');
    },
  });
}

// ─── Permission Checkbox Group ────────────────────────────────────
function PermissionCheckboxGroup({
  available,
  selected,
  onChange,
}: {
  available: Permission[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  // Group by resource
  const groups: Record<string, Permission[]> = {};
  for (const p of available) {
    const res = p.resource || 'other';
    if (!groups[res]) groups[res] = [];
    groups[res].push(p);
  }

  const toggle = (permId: string) => {
    if (selected.includes(permId)) {
      onChange(selected.filter((id) => id !== permId));
    } else {
      onChange([...selected, permId]);
    }
  };

  const selectAllForResource = (resource: string, ids: string[]) => {
    const currentResourceIds = ids.filter((id) =>
      available.find((p) => p.id === id && p.resource === resource)
    );
    const allResourcePermIds = (groups[resource] ?? []).map((p) => p.id);
    const allSelected = currentResourceIds.length === allResourcePermIds.length;

    if (allSelected) {
      // Deselect all for this resource
      onChange(selected.filter((id) => !allResourcePermIds.includes(id)));
    } else {
      // Select all for this resource
      const newSet = new Set([...selected, ...allResourcePermIds]);
      onChange(Array.from(newSet));
    }
  };

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
      {Object.entries(groups).map(([resource, perms]) => {
        const resourcePermIds = perms.map((p) => p.id);
        const selectedInGroup = resourcePermIds.filter((id) =>
          selected.includes(id)
        );
        const allSelected = selectedInGroup.length === perms.length;

        return (
          <div key={resource}>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id={`select-all-${resource}`}
                checked={allSelected}
                onChange={() => selectAllForResource(resource, selected)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor={`select-all-${resource}`}
                className="text-sm font-semibold capitalize cursor-pointer"
              >
                {resource.replace(/-/g, ' ')}
              </label>
              <span className="text-xs text-muted-foreground">
                ({selectedInGroup.length}/{perms.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2 ml-6">
              {perms.map((perm) => (
                <label
                  key={perm.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    selected.includes(perm.id)
                      ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(perm.id)}
                    onChange={() => toggle(perm.id)}
                    className="sr-only"
                  />
                  {perm.action}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Permissions Dialog ────────────────────────────────────────────
function PermissionsDialog({
  role,
  open,
  onOpenChange,
}: {
  role: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: allPerms } = usePermissions();
  const assignPerms = useAssignPermissions();
  const [selected, setSelected] = useState<string[]>([]);

  // Initialize when dialog opens
  const [initialized, setInitialized] = useState(false);
  if (open && !initialized) {
    setSelected(role.permissions?.map((p) => p.id) ?? []);
    setInitialized(true);
  }
  if (!open && initialized) {
    setInitialized(false);
  }

  const handleSave = async () => {
    await assignPerms.mutateAsync({ id: role.id, permissionIds: selected });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Permissions: {role.name}
          </DialogTitle>
        </DialogHeader>
        {allPerms ? (
          <PermissionCheckboxGroup
            available={allPerms}
            selected={selected}
            onChange={setSelected}
          />
        ) : (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={assignPerms.isPending}>
            {assignPerms.isPending ? 'Saving...' : 'Save Permissions'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Role Dialog ──────────────────────────────────────────────
function EditRoleDialog({
  role,
  open,
  onOpenChange,
}: {
  role: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateRole = useUpdateRole();
  const [form, setForm] = useState({ name: role.name, description: role.description ?? '' });
  const [showPerms, setShowPerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateRole.mutateAsync({ id: role.id, ...form });
    onOpenChange(false);
  };

  if (showPerms) {
    return (
      <PermissionsDialog
        role={role}
        open={showPerms}
        onOpenChange={(v) => {
          setShowPerms(v);
          if (!v) onOpenChange(false);
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Role: {role.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="er-name">Role Name</Label>
            <Input
              id="er-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="er-desc">Description</Label>
            <Input
              id="er-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPerms(true)}
              className="w-full"
            >
              Manage Permissions ({role.permissions?.length ?? 0})
            </Button>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateRole.isPending}>
              {updateRole.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Roles Page ────────────────────────────────────────────────
export function RolesPage() {
  const isMobile = !useMediaQuery('(min-width: 768px)');
  const { data: roles, isLoading } = useRoles();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRole.mutateAsync(form);
    setForm({ name: '', description: '' });
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define roles and manage permissions
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>Add Role</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Role</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="r-name">Role Name</Label>
                <Input
                  id="r-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., editor"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-desc">Description</Label>
                <Input
                  id="r-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Role description"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRole.isPending}>
                  {createRole.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {roles?.map((role: Role) => (
            <Card
              key={role.id}
              className="cursor-pointer hover:border-blue-200 transition-colors"
              onClick={() => setEditRole(role)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {role.name}
                    {role.isSystem && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        System
                      </span>
                    )}
                  </CardTitle>
                  {role.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{role.description}</p>
                  )}
                </div>
                {!role.isSystem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete role "${role.name}"?`)) {
                        deleteRole.mutate(role.id);
                      }
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    ✕
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Permissions ({role.permissions?.length ?? 0})
                </p>
                <div className="flex flex-wrap gap-1">
                  {(role.permissions?.length ?? 0) > 0 ? (
                    role.permissions.map((perm: Permission) => (
                      <span
                        key={perm.id}
                        className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
                      >
                        {perm.name || (perm.action + ':' + perm.resource)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No permissions assigned</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {roles?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No roles yet. Create your first role to get started.
            </p>
          )}
        </div>
      )}

      {/* Edit Role Dialog */}
      {editRole && (
        <EditRoleDialog
          role={editRole}
          open={!!editRole}
          onOpenChange={(v) => {
            if (!v) setEditRole(null);
          }}
        />
      )}
    </div>
  );
}

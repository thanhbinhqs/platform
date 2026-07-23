import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Trash2, Pencil, ToggleLeft, Key, UserPlus, Upload, RefreshCw } from 'lucide-react';
import { AppDataGrid } from '../components/app-data-grid';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';

interface AppUser {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  status?: string;
  isActive?: boolean;
  role?: { id: string; name: string } | string;
  roleId?: string;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export function UsersPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<AppUser[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AppUser | null>(null);
  const [deleteItem, setDeleteItem] = useState<AppUser | null>(null);
  const [resetPwdItem, setResetPwdItem] = useState<AppUser | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<any[]>([]);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [filtersDirty, setFiltersDirty] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Pack filter values into URL params
  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (sorting.length > 0) {
      params.sortField = sorting[0].id;
      params.sortDir = sorting[0].desc ? 'desc' : 'asc';
    }
    // Flatten activeFilters into filter[field]=value
    activeFilters
      .filter((f: any) => f.value !== '' && f.value !== undefined && f.value !== null)
      .forEach((f: any) => {
        params[`filter[${f.field}]`] = String(f.value);
      });
    return params;
  }, [debouncedSearch, sorting, activeFilters, filtersDirty]);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, pageSize, filterParams, filtersDirty],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(pageSize),
        ...filterParams,
      });
      const r = await fetch(`/api/v1/users?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
      });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as AppUser[], total: d?.total || 0 };
    },
  });

  const { data: roles } = useQuery({
    queryKey: ['roles-list'],
    queryFn: async () => {
      const r = await fetch('/api/v1/roles', {
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
      });
      const j = await r.json();
      const d = j?.data || j;
      return (d?.data || d || []) as { id: string; name: string }[];
    },
  });

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch('/api/v1/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User created'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      const r = await fetch(`/api/v1/users/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User updated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/v1/users/${id}`, {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPwdMutation = useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      const r = await fetch(`/api/v1/users/${id}/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => { toast.success('Password reset'); setResetPwdItem(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await fetch('/api/v1/users/bulk/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
        body: JSON.stringify({ ids }),
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Users deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkActivateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await fetch('/api/v1/users/bulk/activate', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
        body: JSON.stringify({ ids }),
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Users activated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await fetch('/api/v1/users/bulk/deactivate', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
        body: JSON.stringify({ ids }),
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Users deactivated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: any) => {
      const r = await fetch(`/api/v1/users/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User status toggled'); },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Data ──

  const roleOptions = useMemo(() => (roles || []).map((r: any) => ({ label: r.name, value: r.id })), [roles]);

  // ── Columns ──

  const columns = useMemo<any>(() => [
    { accessorKey: 'username', header: 'Username', size: 180, minSize: 120 },
    { accessorKey: 'email', header: 'Email', size: 260, minSize: 180 },
    { accessorKey: 'displayName', header: 'Display Name', size: 180, minSize: 120, cell: (info: any) => (info.getValue() as string) || '—' },
    { accessorKey: 'role', header: 'Role', size: 160, minSize: 100, cell: (info: any) => { const v = info.getValue(); return typeof v === 'object' && v ? (v as any).name : (v as string) || '—'; } },
    { accessorKey: 'isActive', header: 'Active', size: 100, minSize: 70, cell: (info: any) => info.getValue() !== false ? '✅' : '❌', meta: { align: 'center' as const } },
    { accessorKey: 'createdAt', header: 'Joined', size: 140, minSize: 90, cell: (info: any) => new Date(info.getValue() as string).toLocaleDateString(), meta: { align: 'right' as const } },
  ], []);

  // ── Form Fields (CRUD) ──

  const formFields: CrudField[] = useMemo(() => [
    { name: 'username', label: 'Username', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: editItem ? 'Password (leave blank to keep)' : 'Password', type: 'password', required: !editItem },
    { name: 'displayName', label: 'Display Name' },
    { name: 'roleId', label: 'Role', type: 'select', options: roleOptions },
    { name: 'isActive', label: 'Active', type: 'boolean' },
  ], [editItem, roleOptions]);

  // ── Filter Fields (sidebar) ──

  const filterFields = useMemo(() => [
    { id: 'username', label: 'Username', type: 'text' as const, placeholder: 'Search username...' },
    { id: 'email', label: 'Email', type: 'email' as const, placeholder: 'Search email...' },
    { id: 'displayName', label: 'Display Name', type: 'text' as const, placeholder: 'Search display name...' },
    { id: 'isActive', label: 'Active', type: 'boolean' as const },
    { id: 'roleId', label: 'Role', type: 'instant-search' as const, endpoint: '/api/v1/roles/search', displayField: 'name', multiple: true, placeholder: 'Search roles...' },
    { id: 'createdAt', label: 'Created At', type: 'date-range' as const },
  ], []);

  // ── Bulk Actions ──

  const bulkActions = useMemo(() => [
    { label: 'Delete', icon: <Trash2 size={14} />, onClick: (ids: string[]) => { if (confirm(`Delete ${ids.length} users?`)) bulkDeleteMutation.mutate(ids); } },
    { label: 'Activate', icon: <ToggleLeft size={14} />, onClick: (ids: string[]) => bulkActivateMutation.mutate(ids) },
    { label: 'Deactivate', icon: <ToggleLeft size={14} />, onClick: (ids: string[]) => bulkDeactivateMutation.mutate(ids) },
  ], []);

  // ── Table Actions (top header) ──

  const tableActions = useMemo(() => [
    { label: 'Add User', icon: <UserPlus size={14} />, onClick: () => { setEditItem(null); setDialogOpen(true); }, variant: 'primary' as const },
    { label: 'Import', icon: <Upload size={14} />, onClick: () => toast.info('Import dialog (coming soon)') },
    { label: 'Sync', icon: <RefreshCw size={14} />, onClick: () => toast.info('Syncing with directory...') },
  ], []);

  // ── Context Menu ──

  const contextMenuItems = useMemo(() => [
    { label: 'Edit', icon: <Pencil size={14} />, action: 'edit' },
    { label: 'Reset Password', icon: <Key size={14} />, action: 'reset-password' },
    { label: 'Toggle Active', icon: <ToggleLeft size={14} />, action: 'toggle-active' },
    { divider: true as const },
    { label: 'Delete', icon: <Trash2 size={14} />, action: 'delete' },
  ], []);

  const handleContextMenuAction = useCallback((action: string, row: any) => {
    const u = row as AppUser;
    switch (action) {
      case 'edit':
        setEditItem(u);
        setDialogOpen(true);
        break;
      case 'reset-password':
        setResetPwdItem(u);
        break;
      case 'toggle-active':
        toggleStatusMutation.mutate({ id: u.id, isActive: u.isActive });
        break;
      case 'delete':
        setDeleteItem(u);
        break;
    }
  }, [toggleStatusMutation]);

  // ── Pagination ──

  const handlePaginationChange = useCallback((p: { pageIndex: number; pageSize: number }) => {
    setPage(p.pageIndex);
    setPageSize(p.pageSize);
  }, []);

  const serverSide = useMemo(() => ({
    manualPagination: true as const,
    manualSorting: true as const,
    manualFiltering: false,
    pageCount: Math.ceil((data?.total || 0) / pageSize),
    pagination: { pageIndex: page, pageSize },
    onPaginationChange: handlePaginationChange,
    onSortingChange: setSorting,
  }), [page, pageSize, data?.total, handlePaginationChange, sorting]);

  // ── Form Submit ──

  const handleSubmit = useCallback(async (values: any) => {
    const payload = { ...values };
    if (editItem && !payload.password) delete payload.password;
    if (editItem) {
      await updateMutation.mutateAsync({ id: editItem.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setDialogOpen(false);
    setEditItem(null);
  }, [editItem, createMutation, updateMutation]);

  // ── Loading State ──

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center py-16">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="h-full flex flex-col">
      <AppDataGrid
        columns={columns}
        data={data?.items || []}
        title="Users"
        filterFields={filterFields}
        bulkActions={bulkActions}
        tableActions={tableActions}
        enableSelection
        enableRowNumber
        enableSorting
        enableExport
        enableColumnResize
        enableColumnVisibility
        enableDensity
        pageSize={pageSize}
        pageSizeOptions={[10, 15, 25, 50, 100]}
        total={data?.total || 0}
        onSelectionChange={setSelection}
        emptyMessage="No users found."
        loading={isLoading}
        serverSide={serverSide}
        contextMenuItems={contextMenuItems}
        onContextMenuAction={handleContextMenuAction}
      />

      {/* Create/Edit Dialog */}
      <CrudDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
        title={editItem ? `Edit User: ${editItem.username}` : 'Create User'}
        fields={formFields}
        initialValues={editItem ? {
          ...editItem,
          roleId: editItem.roleId || (typeof editItem.role === 'object' ? (editItem.role as any)?.id : ''),
        } : { isActive: true }}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* Reset Password Dialog */}
      <CrudDialog
        open={!!resetPwdItem}
        onOpenChange={(o) => { if (!o) setResetPwdItem(null); }}
        title={`Reset Password — ${resetPwdItem?.username || ''}`}
        fields={[{ name: 'newPassword', label: 'New Password', type: 'password', required: true }]}
        initialValues={{}}
        onSubmit={async (v) => { if (resetPwdItem) { await resetPwdMutation.mutateAsync({ id: resetPwdItem.id, password: v.newPassword }); } }}
        isPending={resetPwdMutation.isPending}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
        title="Delete User"
        message={`Delete user "${deleteItem?.username}" (${deleteItem?.email})? This cannot be undone.`}
        onConfirm={async () => { await deleteMutation.mutateAsync(deleteItem!.id); setDeleteItem(null); }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Pencil, Trash2, Key, ToggleLeft, UserPlus, Trash } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions, type BulkAction } from '../components/bulk-actions';

interface User { id: string; username: string; email: string; displayName?: string; status?: string; isActive?: boolean; role?: { id: string; name: string } | string; roleId?: string; createdAt: string; [key: string]: unknown; }

export function UsersPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [deleteItem, setDeleteItem] = useState<User | null>(null);
  const [resetPwdItem, setResetPwdItem] = useState<User | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<any[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, pageSize, debouncedSearch, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sorting.length > 0) { params.set('sortField', sorting[0].id); params.set('sortDir', sorting[0].desc ? 'desc' : 'asc'); }
      const r = await fetch(`/api/v1/users?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as User[], total: d?.total || 0 };
    },
  });
  const { data: roles } = useQuery({ queryKey: ['roles-list'], queryFn: async () => { const r = await fetch('/api/v1/roles', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); const j = await r.json(); const d = j?.data || j; return (d?.data || d || []) as { id: string; name: string }[]; } });

  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/users', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User created'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User updated'); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/users/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const resetPwdMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/users/${id}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { toast.success('Password reset'); setResetPwdItem(null); }, onError: (e: Error) => toast.error(e.message) });
  const toggleStatusMutation = useMutation({ mutationFn: async ({ id, isActive }: any) => { const r = await fetch(`/api/v1/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ isActive: !isActive }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User status toggled'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/users/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Users deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkActivateMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/users/bulk/activate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Users activated'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeactivateMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/users/bulk/deactivate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Users deactivated'); }, onError: (e: Error) => toast.error(e.message) });

  const roleOptions = useMemo(() => (roles || []).map((r: any) => ({ label: r.name, value: r.id })), [roles]);

  const columns = useMemo<DataGridColumn<User>[]>(() => [
    { accessorKey: 'username', header: 'Username' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'displayName', header: 'Display Name', cell: ({ getValue }) => (getValue() as string) || '—' },
    { accessorKey: 'role', header: 'Role', cell: ({ getValue }) => { const v = getValue(); return typeof v === 'object' && v ? (v as any).name : (v as string) || '—'; } },
    { accessorKey: 'isActive', header: 'Active', cell: ({ getValue }) => getValue() !== false ? '✅' : '❌' },
    { accessorKey: 'createdAt', header: 'Joined', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
    { id: 'actions', header: '', cell: ({ row }) => {
      const u = row.original;
      return (
        <div className="flex gap-1">
          <button className="p-1 hover:text-primary" title="Edit" onClick={() => { setEditItem(u); setDialogOpen(true); }}><Pencil size={14} /></button>
          <button className="p-1 hover:text-amber-500" title="Reset Password" onClick={() => setResetPwdItem(u)}><Key size={14} /></button>
          <button className="p-1 hover:text-purple-500" title="Toggle Status" onClick={() => toggleStatusMutation.mutate({ id: u.id, isActive: u.isActive }) }><ToggleLeft size={14} /></button>
          <button className="p-1 hover:text-red-500" title="Delete" onClick={() => setDeleteItem(u)}><Trash2 size={14} /></button>
        </div>
      );
    }},
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'username', label: 'Username', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: editItem ? 'Password (leave blank to keep)' : 'Password', type: 'password', required: !editItem },
    { name: 'displayName', label: 'Display Name' },
    { name: 'roleId', label: 'Role', type: 'select', options: roleOptions },
    { name: 'isActive', label: 'Active', type: 'boolean' },
  ], [editItem, roleOptions]);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;

  const handlePaginationChange = useCallback((p: { pageIndex: number; pageSize: number }) => {
    setPage(p.pageIndex);
    setPageSize(p.pageSize);
  }, []);

  const handleGlobalFilterChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const serverSide = useMemo(() => ({
    manualPagination: true as const,
    manualSorting: true as const,
    manualFiltering: false,
    pageCount: Math.ceil((data?.total || 0) / pageSize),
    pagination: { pageIndex: page, pageSize },
    onPaginationChange: handlePaginationChange,
    sorting,
    onSortingChange: setSorting,
    onGlobalFilterChange: handleGlobalFilterChange,
    globalFilter: search,
  }), [page, pageSize, data?.total, handlePaginationChange, sorting, search]);

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}><UserPlus size={16} className="mr-1" /> Add User</Button></div>
      <DataGrid enableSearch columns={columns} data={data?.items || []} title="Users" enableSelection enableRowNumber enableSorting enableColumnVisibility enableExport enableDensity
        onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No users found."
        total={data?.total || 0}
        serverSide={serverSide}
        bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
          { label: 'Delete', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Delete ${ids.length} users?`)) bulkDeleteMutation.mutate(ids); }, variant: 'destructive' },
          { label: 'Activate', icon: <ToggleLeft size={14} />, onClick: (ids) => bulkActivateMutation.mutate(ids) },
          { label: 'Deactivate', icon: <ToggleLeft size={14} />, onClick: (ids) => bulkDeactivateMutation.mutate(ids) },
        ]} />} />

      {/* Create/Edit Dialog */}
      <CrudDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
        title={editItem ? `Edit User: ${editItem.username}` : 'Create User'}
        fields={formFields} initialValues={editItem ? { ...editItem, roleId: editItem.roleId || (typeof editItem.role === 'object' ? (editItem.role as any)?.id : '') } : { isActive: true }}
        onSubmit={async (v) => {
          const payload = { ...v };
          if (editItem && !payload.password) delete payload.password;
          if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, ...payload }); }
          else { await createMutation.mutateAsync(payload); }
          setDialogOpen(false); setEditItem(null);
        }} isPending={createMutation.isPending || updateMutation.isPending} />

      {/* Reset Password Dialog */}
      <CrudDialog open={!!resetPwdItem} onOpenChange={(o) => { if (!o) setResetPwdItem(null); }}
        title={`Reset Password — ${resetPwdItem?.username || ''}`}
        fields={[{ name: 'newPassword', label: 'New Password', type: 'password', required: true }]}
        initialValues={{}}
        onSubmit={async (v) => { if (resetPwdItem) { await resetPwdMutation.mutateAsync({ id: resetPwdItem.id, password: v.newPassword }); } }} isPending={resetPwdMutation.isPending} />

      {/* Delete Confirm */}
      <ConfirmDialog open={!!deleteItem} onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
        title="Delete User" message={`Delete user "${deleteItem?.username}" (${deleteItem?.email})? This cannot be undone.`}
        onConfirm={async () => { await deleteMutation.mutateAsync(deleteItem!.id); setDeleteItem(null); }} isPending={deleteMutation.isPending} />
    </div>
  );
}

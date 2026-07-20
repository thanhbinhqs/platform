import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { ShieldPlus, Shield, Pencil, Trash2, Trash } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions, type BulkAction } from '../components/bulk-actions';

interface Role { id: string; name: string; description?: string; isSystem?: boolean; createdAt: string; [key: string]: unknown; }

export function RolesPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Role[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  const { data, isLoading } = useQuery({
    queryKey: ['roles', page, pageSize],
    queryFn: async () => {
      const r = await fetch(`/api/v1/roles?page=${page + 1}&limit=${pageSize}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Role[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/roles', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role created'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/roles/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role updated'); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/roles/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/roles/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Roles deleted'); }, onError: (e: Error) => toast.error(e.message) });

  const columns = useMemo<DataGridColumn<Role>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => (getValue() as string) || '—' },
    { accessorKey: 'isSystem', header: 'System', cell: ({ getValue }) => getValue() ? '🔒' : '' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button className="p-1 hover:text-primary" title="Edit" onClick={() => { setEditRole(row.original); setDialogOpen(true); }}><Pencil size={14} /></button>
        <button className="p-1 hover:text-red-500" title="Delete" onClick={() => setDeleteRole(row.original)} disabled={row.original.isSystem}><Trash2 size={14} /></button>
      </div>
    )},
  ], []);
  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Role Name', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: false },
  ], []);
  const handleSubmit = useCallback(async (values: any) => {
    if (editRole) { await updateMutation.mutateAsync({ id: editRole.id, ...values }); } else { await createMutation.mutateAsync(values); }
    setDialogOpen(false); setEditRole(null);
  }, [editRole, createMutation, updateMutation]);

  const handlePaginationChange = useCallback((p: { pageIndex: number; pageSize: number }) => {
    setPage(p.pageIndex);
    setPageSize(p.pageSize);
  }, []);

  const serverSide = useMemo(() => ({
    manualPagination: true as const,
    manualSorting: false,
    manualFiltering: false,
    pageCount: Math.ceil((data?.total || 0) / pageSize),
    pagination: { pageIndex: page, pageSize },
    onPaginationChange: handlePaginationChange,
  }), [page, pageSize, data?.total, handlePaginationChange]);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Roles</h1>
      <Button onClick={() => { setEditRole(null); setDialogOpen(true); }}><ShieldPlus size={16} className="mr-1" /> Add Role</Button></div>
    <DataGrid enableSearch columns={columns} data={data?.items || []} title="Roles" enableSelection enableRowNumber enableSorting enableColumnVisibility enableExport enableDensity
      onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No roles found."
      total={data?.total || 0}
      serverSide={serverSide}
      bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
        { label: 'Delete', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Delete ${ids.length} roles? (system roles skipped)`)) bulkDeleteMutation.mutate(ids); } },
      ]} />} />
    <CrudDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditRole(null); }}
      title={editRole ? `Edit Role: ${editRole.name}` : 'Create Role'}
      fields={formFields} initialValues={editRole || {}}
      onSubmit={handleSubmit} isPending={createMutation.isPending || updateMutation.isPending} />
    <ConfirmDialog open={!!deleteRole} onOpenChange={(o) => { if (!o) setDeleteRole(null); }}
      title="Delete Role" message={`Delete role "${deleteRole?.name}"?`}
      onConfirm={async () => { await deleteMutation.mutateAsync(deleteRole!.id); setDeleteRole(null); }} isPending={deleteMutation.isPending} />
  </div>);
}

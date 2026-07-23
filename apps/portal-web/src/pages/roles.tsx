import { toast } from '@platform/hooks';
import { Skeleton } from '@platform/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, RefreshCw, ShieldPlus, Trash, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppDataGrid } from '../components/app-data-grid';
import { ConfirmDialog, CrudDialog, type CrudField } from '../components/crud-dialog';

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  createdAt: string;
  [key: string]: unknown;
}

export function RolesPage() {
  const qc = useQueryClient();
  const [, setSelection] = useState<Role[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
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
    queryKey: ['roles', page, pageSize, debouncedSearch, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sorting.length > 0) {
        params.set('sortField', sorting[0].id);
        params.set('sortDir', sorting[0].desc ? 'desc' : 'asc');
      }
      const r = await fetch(`/api/v1/roles?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
        },
      });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Role[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch('/api/v1/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      const r = await fetch(`/api/v1/roles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/v1/roles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await fetch('/api/v1/roles/bulk/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
        },
        body: JSON.stringify({ ids }),
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Roles deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const contextMenuItems = useMemo(
    () => [
      { label: 'Edit', icon: <Pencil size={14} />, action: 'edit' },
      { label: 'Duplicate', icon: <ShieldPlus size={14} />, action: 'duplicate' },
      { divider: true },
      {
        label: 'Delete',
        icon: <Trash2 size={14} />,
        action: 'delete',
        disabled: (r: any) => r.isSystem === true,
      },
    ],
    [],
  );

  const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'edit':
        setEditRole(row);
        setDialogOpen(true);
        break;
      case 'duplicate':
        toast.info(`Duplicate role: ${row.name}`);
        break;
      case 'delete':
        setDeleteRole(row);
        break;
    }
  }, []);

  const columns = useMemo<any>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: (info: any) => (info.getValue() as string) || '—',
      },
      {
        accessorKey: 'isSystem',
        header: 'System',
        cell: (info: any) => (info.getValue() ? '🔒' : ''),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: (info: any) => new Date(info.getValue() as string).toLocaleDateString(),
      },
    ],
    [],
  );

  const formFields: CrudField[] = useMemo(
    () => [
      { name: 'name', label: 'Role Name', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: false },
    ],
    [],
  );

  const filterFields = useMemo(
    () => [
      { id: 'name', label: 'Name', type: 'text' as const, placeholder: 'Search name...' },
      {
        id: 'description',
        label: 'Description',
        type: 'text' as const,
        placeholder: 'Search description...',
      },
      { id: 'isSystem', label: 'System Role', type: 'checkbox' as const },
      { id: 'createdAt', label: 'Created At', type: 'date-range' as const },
    ],
    [],
  );

  const bulkActions = useMemo(
    () => [
      {
        label: 'Delete Selected',
        icon: <Trash size={14} />,
        onClick: (ids: string[]) => {
          if (confirm(`Delete ${ids.length} roles? (system roles skipped)`))
            bulkDeleteMutation.mutate(ids);
        },
      },
    ],
    [],
  );

  const tableActions = useMemo(
    () => [
      {
        label: 'Add Role',
        icon: <ShieldPlus size={14} />,
        onClick: () => {
          setEditRole(null);
          setDialogOpen(true);
        },
        variant: 'primary' as const,
      },
      { label: 'Import', icon: <Upload size={14} />, onClick: () => toast.info('Import dialog') },
      { label: 'Sync', icon: <RefreshCw size={14} />, onClick: () => toast.info('Syncing...') },
    ],
    [],
  );

  const handleSubmit = useCallback(
    async (values: any) => {
      if (editRole) {
        await updateMutation.mutateAsync({ id: editRole.id, ...values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setDialogOpen(false);
      setEditRole(null);
    },
    [editRole, createMutation, updateMutation],
  );

  const handlePaginationChange = useCallback((p: { pageIndex: number; pageSize: number }) => {
    setPage(p.pageIndex);
    setPageSize(p.pageSize);
  }, []);

  const serverSide = useMemo(
    () => ({
      manualPagination: true as const,
      manualSorting: true as const,
      manualFiltering: false,
      pageCount: Math.ceil((data?.total || 0) / pageSize),
      pagination: { pageIndex: page, pageSize },
      onPaginationChange: handlePaginationChange,
      sorting,
      onSortingChange: setSorting,
    }),
    [page, pageSize, data?.total, handlePaginationChange, sorting],
  );

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-16">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  return (
    <div className="h-full flex flex-col">
      <AppDataGrid
        columns={columns}
        data={data?.items || []}
        title="Roles"
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
        onSearch={(val) => {
          setSearch(val);
          setPage(0);
        }}
        emptyMessage="No roles found."
        loading={isLoading}
        serverSide={serverSide}
        contextMenuItems={contextMenuItems}
        onContextMenuAction={handleContextMenuAction}
      />
      <CrudDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditRole(null);
        }}
        title={editRole ? `Edit Role: ${editRole.name}` : 'Create Role'}
        fields={formFields}
        initialValues={editRole || {}}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
      <ConfirmDialog
        open={!!deleteRole}
        onOpenChange={(o) => {
          if (!o) setDeleteRole(null);
        }}
        title="Delete Role"
        message={`Delete role "${deleteRole?.name}"?`}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(deleteRole!.id);
          setDeleteRole(null);
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

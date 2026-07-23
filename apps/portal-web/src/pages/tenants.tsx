import { toast } from '@platform/hooks';
import { Skeleton } from '@platform/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil, RefreshCw, Trash, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppDataGrid } from '../components/app-data-grid';
import { ConfirmDialog, CrudDialog, type CrudField } from '../components/crud-dialog';

interface Item {
  id: string;
  name: string;
  domain?: string;
  isActive: boolean;
  plan?: string;
  createdAt: string;
  [key: string]: unknown;
}

export function TenantsPage() {
  const qc = useQueryClient();
  const [, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<any[]>([]);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', page, pageSize, debouncedSearch, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sorting.length > 0) {
        params.set('sortField', sorting[0].id);
        params.set('sortDir', sorting[0].desc ? 'desc' : 'asc');
      }
      const r = await fetch(`/api/v1/tenants?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
        },
      });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch('/api/v1/tenants', {
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
      qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await fetch('/api/v1/tenants/bulk/delete', {
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
      qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenants deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      const r = await fetch(`/api/v1/tenants/${id}`, {
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
      qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/v1/tenants/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
      });
      if (!r.ok) throw new Error((await r.json()).message || 'Failed');
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const contextMenuItems = useMemo(
    () => [
      { label: 'Edit', icon: <Pencil size={14} />, action: 'edit' },
      { divider: true },
      { label: 'Delete', icon: <Trash size={14} />, action: 'delete' },
    ],
    [],
  );

  const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'edit':
        setEditItem(row);
        setDialogOpen(true);
        break;
      case 'delete':
        setDeleteItem(row);
        break;
    }
  }, []);

  const columns = useMemo<any>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'domain', header: 'Domain' },
      { accessorKey: 'plan', header: 'Plan' },
      {
        accessorKey: 'isActive',
        header: 'Active',
        cell: (info: any) => (info.getValue() ? '✅' : '❌'),
      },
    ],
    [],
  );

  const formFields: CrudField[] = useMemo(
    () => [
      { name: 'name', label: 'Name', required: true },
      { name: 'domain', label: 'Domain' },
      {
        name: 'plan',
        label: 'Plan',
        type: 'select',
        options: [
          { label: 'Free', value: 'FREE' },
          { label: 'Pro', value: 'PRO' },
          { label: 'Enterprise', value: 'ENTERPRISE' },
        ],
      },
      { name: 'isActive', label: 'Active', type: 'boolean' },
    ],
    [],
  );

  const filterFields = useMemo(
    () => [
      { id: 'name', label: 'Name', type: 'text' as const },
      { id: 'domain', label: 'Domain', type: 'text' as const },
      { id: 'isActive', label: 'Active', type: 'checkbox' as const },
      {
        id: 'plan',
        label: 'Plan',
        type: 'select' as const,
        options: [
          { label: 'Free', value: 'FREE' },
          { label: 'Pro', value: 'PRO' },
          { label: 'Enterprise', value: 'ENTERPRISE' },
        ],
      },
    ],
    [],
  );

  const bulkActions = useMemo(
    () => [
      {
        label: 'Delete',
        icon: <Trash size={14} />,
        onClick: (ids: string[]) => {
          if (confirm(`Delete ${ids.length} tenants?`)) bulkDeleteMutation.mutate(ids);
        },
      },
    ],
    [],
  );

  const tableActions = useMemo(
    () => [
      {
        label: 'Add Tenant',
        icon: <Building2 size={14} />,
        onClick: () => {
          setEditItem(null);
          setDialogOpen(true);
        },
        variant: 'primary' as const,
      },
      { label: 'Import', icon: <Upload size={14} />, onClick: () => toast.info('Import dialog') },
      { label: 'Sync', icon: <RefreshCw size={14} />, onClick: () => toast.info('Syncing...') },
    ],
    [],
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
        title="Tenants"
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
        emptyMessage="No tenants found."
        loading={isLoading}
        serverSide={serverSide}
        contextMenuItems={contextMenuItems}
        onContextMenuAction={handleContextMenuAction}
      />
      <CrudDialog
        open={dialogOpen || !!editItem}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditItem(null);
        }}
        title={editItem ? 'Edit Tenant' : 'Create Tenant'}
        fields={formFields}
        initialValues={editItem || { isActive: true, plan: 'FREE' }}
        onSubmit={async (v) => {
          if (editItem) {
            await updateMutation.mutateAsync({ id: editItem.id, ...v });
            setEditItem(null);
          } else {
            await createMutation.mutateAsync(v);
          }
          setDialogOpen(false);
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => {
          if (!o) setDeleteItem(null);
        }}
        title="Delete Tenant"
        message={`Are you sure you want to delete tenant ${deleteItem?.name}?`}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(deleteItem!.id);
          setDeleteItem(null);
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

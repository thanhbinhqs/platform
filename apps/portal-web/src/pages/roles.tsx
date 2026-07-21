import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Filter, Pencil, Shield, ShieldPlus, Trash, Trash2 } from 'lucide-react';
import { CrudDialog, ConfirmDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions, type BulkAction } from '../components/bulk-actions';
import { FilterSidebar, type FilterField, type ActiveFilter } from '../components/filter-sidebar';

interface Role { id: string; name: string; description?: string; isSystem?: boolean; createdAt: string; [key: string]: unknown; }

export function RolesPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Role[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['roles', page, pageSize, debouncedSearch, sorting, activeFilters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sorting.length > 0) { params.set('sortField', sorting[0].id); params.set('sortDir', sorting[0].desc ? 'desc' : 'asc'); }
      activeFilters.filter(f => f.value !== '' && f.value !== undefined && f.value !== null).forEach(f => {
        params.set(`filter[${f.field}]`, String(f.value));
      });
      const r = await fetch(`/api/v1/roles?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Role[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/roles', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role created'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/roles/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role updated'); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const r = await fetch(`/api/v1/roles/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/roles/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Roles deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const contextMenuItems = useMemo(() => [
    { label: 'Edit', icon: <Pencil size={14} />, action: 'edit' },
    { label: 'Duplicate', icon: <ShieldPlus size={14} />, action: 'duplicate' },
    { divider: true },
    { label: 'Delete', icon: <Trash2 size={14} />, action: 'delete', disabled: (r: any) => r.isSystem === true },
  ], []);

      const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'edit': setEditRole(row); setDialogOpen(true); break;
      case 'duplicate': toast.info(`Duplicate role: ${row.name}`); break;
      case 'delete': setDeleteRole(row); break;
    }
  }, [setDeleteRole, setEditRole, toast]);


  const columns = useMemo<DataGridColumn<Role>[]>(() => [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => (getValue() as string) || '—' },
    { accessorKey: 'isSystem', header: 'System', cell: ({ getValue }) => getValue() ? '🔒' : '' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString() },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <button className="p-1 hover:text-primary" title="Edit" onClick={() => { setEditRole(row.original); setDialogOpen(true); }}><Pencil size={14}  /></button>
        <button className="p-1 hover:text-red-500" title="Delete" onClick={() => setDeleteRole(row.original)} disabled={row.original.isSystem}><Trash2 size={14} /></button>
      </div>
    )},
  ], []);
  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Role Name', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: false },
  ], []);

  const filterFields: FilterField[] = useMemo(() => [
    { id: 'name', label: 'Name', type: 'text', placeholder: 'Search name...' },
    { id: 'description', label: 'Description', type: 'text', placeholder: 'Search description...' },
    { id: 'isSystem', label: 'System Role', type: 'checkbox' },
    { id: 'createdAt', label: 'Created At', type: 'date-range' },
  ], []);

  const handleSubmit = useCallback(async (values: any) => {
    if (editRole) { await updateMutation.mutateAsync({ id: editRole.id, ...values }); } else { await createMutation.mutateAsync(values); }
    setDialogOpen(false); setEditRole(null);
  }, [editRole, createMutation, updateMutation]);

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

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Roles</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}><Filter size={16} /></Button>
        <Button onClick={() => { setEditRole(null); setDialogOpen(true); }}><ShieldPlus size={16} className="mr-1" /> Add Role</Button></div></div>
    <div className="flex flex-1 gap-4 overflow-hidden">
      <FilterSidebar
        filterFields={filterFields}
        activeFilters={activeFilters}
        onActiveFiltersChange={setActiveFilters}
        searchQuery={search}
        onSearchChange={handleGlobalFilterChange}
        show={showFilters}
        onToggle={setShowFilters}
      />
      <DataGrid enableSearch columns={columns} data={data?.items || []} title="Roles" enableSelection enableRowNumber enableSorting enableColumnVisibility enableExport enableDensity
        onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No roles found."
        total={data?.total || 0}
        serverSide={serverSide}
        bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
          { label: 'Delete', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Delete ${ids.length} roles? (system roles skipped)`)) bulkDeleteMutation.mutate(ids); } },
        ]} />}
        contextMenuItems={contextMenuItems} onContextMenuAction={handleContextMenuAction} />
    </div>
    <CrudDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditRole(null); }}
      title={editRole ? `Edit Role: ${editRole.name}` : 'Create Role'}
      fields={formFields} initialValues={editRole || {}}
      onSubmit={handleSubmit} isPending={createMutation.isPending || updateMutation.isPending} />
    <ConfirmDialog open={!!deleteRole} onOpenChange={(o) => { if (!o) setDeleteRole(null); }}
      title="Delete Role" message={`Delete role "${deleteRole?.name}"?`}
      onConfirm={async () => { await deleteMutation.mutateAsync(deleteRole!.id); setDeleteRole(null); }} isPending={deleteMutation.isPending} />
  </div>);
}

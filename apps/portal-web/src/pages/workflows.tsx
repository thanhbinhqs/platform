import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import { Filter } from 'lucide-react';
import { Trash, Pencil, Workflow } from 'lucide-react';
import { Archive, Play } from 'lucide-react';
import { CrudDialog, type CrudField } from '../components/crud-dialog';
import { BulkActions } from '../components/bulk-actions';
import { FilterSidebar, type FilterField, type ActiveFilter } from '../components/filter-sidebar';

interface Item { id: string; name: string; type: string; status: string; trigger?: string; createdAt: string; [key: string]: unknown; }

export function WorkflowsPage() {
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<any[]>([]);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [showFilter, setShowFilter] = useState(true);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['workflows', page, pageSize, debouncedSearch, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sorting.length > 0) { params.set('sortField', sorting[0].id); params.set('sortDir', sorting[0].desc ? 'desc' : 'asc'); }
      const r = await fetch(`/api/v1/workflows?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const createMutation = useMutation({ mutationFn: async (body: any) => { const r = await fetch('/api/v1/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow created'); }, onError: (e: Error) => toast.error(e.message) });
  const bulkDeleteMutation = useMutation({ mutationFn: async (ids: string[]) => { const r = await fetch('/api/v1/workflows/bulk/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify({ ids }) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflows deleted'); }, onError: (e: Error) => toast.error(e.message) });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...body }: any) => { const r = await fetch(`/api/v1/workflows/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }, body: JSON.stringify(body) }); if (!r.ok) throw new Error((await r.json()).message || 'Failed'); return r.json(); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow updated'); }, onError: (e: Error) => toast.error(e.message) });
  const contextMenuItems = useMemo(() => [
    { label: 'Run', icon: <Play size={14} />, action: 'run', disabled: (r: any) => r.status === 'RUNNING' },
    { label: 'Edit', icon: <Pencil size={14} />, action: 'edit' },
    { divider: true },
    { label: 'Archive', icon: <Archive size={14} />, action: 'archive', disabled: (r: any) => r.status === 'ARCHIVED' },
  ], []);

      const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'run': toast.info(`Run workflow: ${row.name}`); break;
      case 'edit': setEditItem(row); setDialogOpen(true); break;
      case 'archive': if (confirm(`Archive workflow ${row.name}?`)) bulkDeleteMutation.mutate([row.id]); break;
    }
  }, [bulkDeleteMutation, toast]);


  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'name', header: 'Name' }, { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'status', header: 'Status' }, { accessorKey: 'trigger', header: 'Trigger' },
  ], []);

  const formFields: CrudField[] = useMemo(() => [
    { name: 'name', label: 'Name', required: true }, { name: 'type', label: 'Type' },
    { name: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }, { label: 'Draft', value: 'DRAFT' }] },
  ], []);

  const filterFields: FilterField[] = useMemo(() => [
    { id: 'name', label: 'Name', type: 'text', placeholder: 'Search by name...' },
    { id: 'type', label: 'Type', type: 'select', options: [{ label: 'All Types', value: '' }, { label: 'Manual', value: 'MANUAL' }, { label: 'Automated', value: 'AUTOMATED' }, { label: 'Triggered', value: 'TRIGGERED' }] },
    { id: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }, { label: 'Draft', value: 'DRAFT' }, { label: 'Archived', value: 'ARCHIVED' }] },
    { id: 'trigger', label: 'Trigger', type: 'text', placeholder: 'Filter by trigger...' },
    { id: 'createdAt', label: 'Created Date', type: 'date-range' },
  ], []);

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

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full"  /></div>;
  return (<div className="h-full flex flex-col space-y-4 overflow-hidden">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Workflows</h1>
      <Button onClick={() => { setDialogOpen(true); }}><Workflow size={16} className="mr-1" /> Add Workflow</Button></div>
    <div className="flex flex-1 min-h-0">
      <FilterSidebar
        filterFields={filterFields}
        activeFilters={activeFilters}
        onActiveFiltersChange={setActiveFilters}
        searchQuery={search}
        onSearchChange={handleGlobalFilterChange}
        show={showFilter}
        onToggle={setShowFilter}
      />
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        <DataGrid columns={columns} data={data?.items || []} title="Workflows" enableSelection enableSorting enableColumnVisibility enableExport enableDensity enableRowNumber onSelectionChange={setSelection} pageSize={pageSize} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No workflows found."
          total={data?.total || 0}
          serverSide={serverSide}
          bulkActions={<BulkActions selectedIds={selection.map(s => s.id)} actions={[
            { label: 'Delete', icon: <Trash size={14} />, onClick: (ids) => { if (confirm(`Delete ${ids.length} workflows?`)) bulkDeleteMutation.mutate(ids); } },
          ]} />}
            contextMenuItems={contextMenuItems} onContextMenuAction={handleContextMenuAction} />
        <CrudDialog open={dialogOpen || !!editItem} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditItem(null); }}
          title={editItem ? "Edit Workflow" : "Create Workflow"} fields={formFields}
          initialValues={editItem || { status: 'DRAFT' }}
          onSubmit={async (v) => { if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, ...v }); setEditItem(null); } else { await createMutation.mutateAsync(v); } setDialogOpen(false); }} isPending={createMutation.isPending || updateMutation.isPending} />
      </div>
    </div>
  </div>);
}

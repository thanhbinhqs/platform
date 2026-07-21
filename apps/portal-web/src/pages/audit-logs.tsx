import { useMemo, useState, useCallback, useEffect } from 'react';
import { toast } from '@platform/hooks';
import { Eye, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, type DataGridColumn, Skeleton } from '@platform/ui';
import { FilterSidebar, type FilterField, type ActiveFilter } from '../components/filter-sidebar';
interface Item { id: string; user: any; action: string; entity: string; entityId: string; createdAt: string; [key: string]: unknown; }
export function AuditLogsPage() {
  const [selection, setSelection] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<any[]>([]);
  const [showFilter, setShowFilter] = useState(true);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, pageSize, debouncedSearch, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sorting.length > 0) { params.set('sortField', sorting[0].id); params.set('sortDir', sorting[0].desc ? 'desc' : 'asc'); }
      const r = await fetch(`/api/v1/audit-logs?${params.toString()}`, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || 0 };
    },
  });
  const contextMenuItems = useMemo(() => [
    { label: 'View Details', icon: <Eye size={14} />, action: 'view' },
  ], []);

      const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'view': toast.info(`View details: ${row.name || row.id}`); break;
    }
  }, [toast]);

  const columns = useMemo<DataGridColumn<Item>[]>(() => [
    { accessorKey: 'user', header: 'User', cell: ({ getValue }) => (getValue() as any)?.username || '—' },
    { accessorKey: 'action', header: 'Action' },
    { accessorKey: 'entity', header: 'Entity' },
    { accessorKey: 'entityId', header: 'Entity ID' },
    { accessorKey: 'createdAt', header: 'Date', cell: ({ getValue }) => new Date(getValue() as string).toLocaleString() },
  ], []);

  const filterFields: FilterField[] = useMemo(() => [
    { id: 'user', label: 'User', type: 'text', placeholder: 'Search by username...' },
    { id: 'action', label: 'Action', type: 'select', options: [{ label: 'All Actions', value: '' }, { label: 'Create', value: 'CREATE' }, { label: 'Update', value: 'UPDATE' }, { label: 'Delete', value: 'DELETE' }, { label: 'Read', value: 'READ' }] },
    { id: 'entity', label: 'Entity', type: 'text', placeholder: 'Filter by entity...' },
    { id: 'entityId', label: 'Entity ID', type: 'text', placeholder: 'Filter by entity ID...' },
    { id: 'createdAt', label: 'Date Range', type: 'date-range' },
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
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Audit Logs</h1></div>
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
        <DataGrid columns={columns} data={data?.items || []} title="Audit Logs" enableSorting enableColumnVisibility enableExport enableDensity pageSize={pageSize} pageSizeOptions={[10, 20, 50, 100]} emptyMessage="No audit logs found."
          total={data?.total || 0}
          serverSide={serverSide}
          contextMenuItems={contextMenuItems}
          onContextMenuAction={handleContextMenuAction} />
      </div>
    </div>
  </div>);
}
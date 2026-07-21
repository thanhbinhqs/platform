import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppDataGrid } from '../components/app-data-grid';
import { toast } from '@platform/hooks';
import { Trash2, Pencil, ToggleLeft } from 'lucide-react';

interface Item { id: string; name: string; event: string; status: string; priority: number; createdAt: string; [key: string]: unknown; }

export function RulesPage() {
  const [selection, setSelection] = useState<Item[]>([]);
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
    queryKey: ['rules', page, pageSize, debouncedSearch, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sorting.length > 0) { params.set('sortField', sorting[0].id); params.set('sortDir', sorting[0].desc ? 'desc' : 'asc'); }
      const r = await fetch(`/api/v1/rules?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }
      });
      const j = await r.json();
      // Backend wraps in { success, data: { data, total, page, pageSize, totalPages } }
      const payload = j?.data || j;
      return {
        items: (Array.isArray(payload) ? payload : payload?.data || []) as Item[],
        total: payload?.total || 0,
      };
    },
  });

  const columns = useMemo(() => [
    { accessorKey: 'name', header: 'Name', size: 280, minSize: 180, meta: { cellClass: 'truncate' } },
    { accessorKey: 'event', header: 'Event', size: 200, minSize: 140 },
    { accessorKey: 'status', header: 'Status', size: 120, minSize: 90, meta: { align: 'center' as const } },
    { accessorKey: 'priority', header: 'Priority', size: 120, minSize: 80, meta: { align: 'center' as const } },
    { accessorKey: 'createdAt', header: 'Created', size: 160, minSize: 100, cell: ({ getValue }: any) => new Date(getValue() as string).toLocaleDateString(), meta: { align: 'right' as const } },
  ], []);

  const filterFields = useMemo(() => [
    { id: 'name', label: 'Name', type: 'text' as const, placeholder: 'Search by name...' },
    { id: 'event', label: 'Event', type: 'text' as const },
    { id: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Draft', value: 'draft' },
    ]},
    { id: 'priority', label: 'Priority', type: 'number-range' as const },
    { id: 'createdAt', label: 'Created Date', type: 'date-range' as const },
  ], []);

  const bulkActions = useMemo(() => [
    { label: 'Delete Selected', icon: '🗑️', onClick: (ids: string[]) => toast.info(`Delete ${ids.length} items`) },
    { label: 'Export Selected', icon: '📥', onClick: (ids: string[]) => toast.info(`Export ${ids.length} items`) },
    { label: 'Activate All', icon: '✅', onClick: (ids: string[]) => toast.info(`Activate ${ids.length} items`) },
  ], []);

  const tableActions = useMemo(() => [
    { label: 'Add Rule', icon: '➕', onClick: () => toast.success('Add rule dialog'), variant: 'primary' as const },
    { label: 'Import', icon: '📤', onClick: () => toast.info('Import dialog') },
    { label: 'Sync', icon: '🔄', onClick: () => toast.info('Syncing...') },
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
    onSortingChange: setSorting,
    onGlobalFilterChange: handleGlobalFilterChange,
  }), [page, pageSize, data?.total, handlePaginationChange, sorting, search]);

  const contextMenuItems = useMemo(() => [
    { label: 'Edit', icon: <Pencil size={14} />, action: 'edit' },
    { label: 'Toggle Active', icon: <ToggleLeft size={14} />, action: 'toggle' },
    { divider: true },
    { label: 'Delete', icon: <Trash2 size={14} />, action: 'delete' },
  ], []);

    const handleContextMenuAction = useCallback((action: string, row: any) => {
    switch (action) {
      case 'edit': toast.info(`Edit: ${row.name || row.id}`); break;
      case 'toggle': toast.info(`Toggle: ${row.name || row.id}`); break;
      case 'delete': toast.info(`Delete: ${row.name || row.id}`); break;
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      <AppDataGrid
        columns={columns}
        data={data?.items || []}
        title="Rules"
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
        pageSizeOptions={[10, 15, 20, 50, 100]}
        total={data?.total || 0}
        onSelectionChange={setSelection}
        emptyMessage="No rules found."
        loading={isLoading}
        serverSide={serverSide}
        contextMenuItems={contextMenuItems}
        onContextMenuAction={handleContextMenuAction}
      />
    </div>
  );
}

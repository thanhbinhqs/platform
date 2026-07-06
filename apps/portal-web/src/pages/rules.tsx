import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppDataGrid } from '../components/app-data-grid';
import { toast } from '@platform/hooks';

interface Item { id: string; name: string; event: string; status: string; priority: number; createdAt: string; [key: string]: unknown; }

export function RulesPage() {
  const [selection, setSelection] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  const { data, isLoading } = useQuery({
    queryKey: ['rules', page, pageSize],
    queryFn: async () => {
      const r = await fetch(`/api/v1/rules?page=${page + 1}&limit=${pageSize}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }
      });
      const j = await r.json();
      const d = j?.data || j;
      return { items: (d?.data || d || []) as Item[], total: d?.total || (d?.data || d || []).length };
    },
  });

  const columns = useMemo(() => [
    { accessorKey: 'name', header: 'Name', meta: { cellClass: 'max-w-[200px] truncate' } },
    { accessorKey: 'event', header: 'Event' },
    { accessorKey: 'status', header: 'Status', meta: { align: 'center' as const } },
    { accessorKey: 'priority', header: 'Priority', meta: { align: 'center' as const } },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }: any) => new Date(getValue() as string).toLocaleDateString(), meta: { align: 'right' as const } },
  ], []);

  const filterFields = useMemo(() => [
    { id: 'name', label: 'Name', type: 'text' as const, placeholder: 'Search by name...' },
    { id: 'event', label: 'Event', type: 'text' as const },
    { id: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }, { label: 'Draft', value: 'DRAFT' },
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

  const serverSide = useMemo(() => ({
    manualPagination: true as const,
    manualSorting: false,
    manualFiltering: false,
    pageCount: Math.ceil((data?.total || 0) / pageSize),
    pagination: { pageIndex: page, pageSize },
    onPaginationChange: (p: { pageIndex: number; pageSize: number }) => { setPage(p.pageIndex); setPageSize(p.pageSize); },
  }), [page, pageSize, data?.total]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
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
        enableDensity
        pageSize={pageSize}
        onSelectionChange={setSelection}
        emptyMessage="No rules found."
        loading={isLoading}
        serverSide={serverSide}
      />
    </div>
  );
}

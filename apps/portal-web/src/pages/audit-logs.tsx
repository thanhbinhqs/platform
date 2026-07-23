import { useMemo, useState, useCallback } from 'react';
import { toast } from '@platform/hooks';
import { Eye, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@platform/ui';
import { AppDataGrid } from '../components/app-data-grid';

interface Item { id: string; user: any; action: string; entity: string; entityId: string; createdAt: string; [key: string]: unknown; }

export function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [sorting, setSorting] = useState<any[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, pageSize, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
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

  const columns = useMemo<any>(() => [
    { accessorKey: 'user', header: 'User', cell: (info: any) => (info.getValue() as any)?.username || '—' },
    { accessorKey: 'action', header: 'Action' },
    { accessorKey: 'entity', header: 'Entity' },
    { accessorKey: 'entityId', header: 'Entity ID' },
    { accessorKey: 'createdAt', header: 'Date', cell: (info: any) => new Date(info.getValue() as string).toLocaleString() },
  ], []);

  const filterFields = useMemo(() => [
    { id: 'user', label: 'User', type: 'text' as const, placeholder: 'Search by username...' },
    { id: 'action', label: 'Action', type: 'select' as const, options: [{ label: 'All Actions', value: '' }, { label: 'Create', value: 'CREATE' }, { label: 'Update', value: 'UPDATE' }, { label: 'Delete', value: 'DELETE' }, { label: 'Read', value: 'READ' }] },
    { id: 'entity', label: 'Entity', type: 'text' as const, placeholder: 'Filter by entity...' },
    { id: 'entityId', label: 'Entity ID', type: 'text' as const, placeholder: 'Filter by entity ID...' },
    { id: 'createdAt', label: 'Date Range', type: 'date-range' as const },
  ], []);

  const tableActions = useMemo(() => [
    { label: 'Export Audit', icon: <Download size={14} />, variant: 'default' as const, onClick: () => toast.info('Exporting audit logs...') },
  ], []);

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

  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full"  /></div>;
  return (
    <div className="h-full flex flex-col">
      <AppDataGrid
        columns={columns}
        data={data?.items || []}
        title="Audit Logs"
        filterFields={filterFields}
        tableActions={tableActions}
        enableSorting
        enableExport
        enableColumnResize
        enableColumnVisibility
        enableDensity
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50, 100]}
        total={data?.total || 0}
        emptyMessage="No audit logs found."
        loading={isLoading}
        serverSide={serverSide}
        contextMenuItems={contextMenuItems}
        onContextMenuAction={handleContextMenuAction}
      />
    </div>
  );
}

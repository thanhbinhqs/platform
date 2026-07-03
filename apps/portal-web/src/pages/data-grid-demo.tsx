import { useMemo, useState, useCallback } from 'react';
import { DataGrid, type DataGridColumn, Button } from '@platform/ui';
import { toast } from '@platform/hooks';
import apiClient from '@platform/api-client';

interface UserRow {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  status: string;
  createdAt: string;
  roles: { id: string; name: string }[];
}

export function DataGridDemoPage() {
  const [data, setData] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<UserRow[]>([]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const r = await apiClient.get('/users');
      const d = (r.data.data || r.data);
      setData((d.data || d) as UserRow[]);
    } catch {
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const columns = useMemo<DataGridColumn<UserRow>[]>(() => [
    {
      accessorKey: 'username',
      header: 'Username',
      meta: { filterType: 'text' },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      meta: { align: 'left' },
    },
    {
      accessorKey: 'displayName',
      header: 'Display Name',
      cell: ({ getValue }) => (getValue() as string) || '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { align: 'center' },
      cell: ({ getValue }) => {
        const status = getValue() as string;
        const colors: Record<string, string> = {
          ACTIVE: 'bg-green-100 text-green-700',
          INACTIVE: 'bg-gray-100 text-gray-500',
          LOCKED: 'bg-red-100 text-red-700',
          PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-700',
        };
        return (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-500'}`}>
            {status}
          </span>
        );
      },
    },
    {
      id: 'roles',
      header: 'Roles',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles?.map((r) => (
            <span key={r.id} className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {r.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      meta: { align: 'right' },
      cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
    },
  ], []);

  const bulkActions = selection.length > 0 ? (
    <Button size="sm" variant="outline" className="text-red-500" onClick={() => {
      toast.success(`Would delete ${selection.length} users`);
    }}>
      Delete Selected
    </Button>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">📊 DataGrid Demo</h1>
        <Button size="sm" onClick={fetchUsers} disabled={isLoading}>
          {isLoading ? 'Loading…' : 'Load Users'}
        </Button>
        {data.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => { setData([]); setSelection([]); }}>
            Clear
          </Button>
        )}
      </div>

      {data.length === 0 && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">Click <strong>Load Users</strong> to populate the grid</p>
          <p className="mt-1 text-sm text-muted-foreground">Try sorting, searching, selecting, toggling columns, and exporting</p>
        </div>
      )}

      <DataGrid
        columns={columns}
        data={data}
        isLoading={isLoading}
        error={error}
        onRetry={fetchUsers}
        title="Users"
        enableSelection
        enableSorting
        enableColumnVisibility
        enableExport
        enableDensity
        enableColumnResize
        onSelectionChange={setSelection}
        onRowClick={(row) => toast.info(`Clicked: ${row.username}`)}
        bulkActions={bulkActions}
        actionButtons={
          <Button size="sm" variant="outline" onClick={() => toast.success('Action clicked')}>
            Custom Action
          </Button>
        }
        emptyMessage="No users loaded. Click 'Load Users' above."
        pageSize={10}
        pageSizeOptions={[5, 10, 20, 50]}
      />
    </div>
  );
}

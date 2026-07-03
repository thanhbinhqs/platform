import { useMemo, useState, useCallback, useRef } from 'react';
import { CustomDataGrid, RestDataSource, type CustomDataGridProps, SelectionPlugin, ScannerPlugin } from '@platform/ui';
import type { ContextMenuItem } from '@platform/ui';
import { toast } from '@platform/hooks';

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

export function DataGridDemoPage() {
  const [selection, setSelection] = useState<User[]>([]);
  const counterRef = useRef(0);

  // REST DataSource pointing to our users API
  const dataSource = useMemo(() => new RestDataSource<User>('/users'), []);

  const columns = useMemo(() => [
    { accessorKey: 'username', header: 'Username', meta: { filterType: 'text' } },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'displayName', header: 'Display Name', cell: ({ getValue }: any) => (getValue() as string) || '—' },
    {
      accessorKey: 'status', header: 'Status', meta: { align: 'center' },
      cell: ({ getValue }: any) => {
        const s = getValue() as string;
        const colors: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-700', INACTIVE: 'bg-gray-100 text-gray-500', LOCKED: 'bg-red-100 text-red-700', PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-700' };
        return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[s] || ''}`}>{s}</span>;
      },
    },
    { accessorKey: 'createdAt', header: 'Created', meta: { align: 'right' }, cell: ({ getValue }: any) => new Date(getValue() as string).toLocaleDateString() },
  ], []);

  const contextMenuItems = useMemo<ContextMenuItem[]>(() => [
    { label: 'View Details', icon: '👁️', action: 'view' },
    { label: 'Edit User', icon: '✏️', action: 'edit' },
    { label: '—', action: '', divider: true },
    { label: 'Delete', icon: '🗑️', action: 'delete', disabled: (row) => row.username === 'admin' },
  ], []);

  const rowClassName = useCallback((row: User) => {
    if (row.status === 'LOCKED') return 'bg-red-50 dark:bg-red-950/20';
    if (row.status === 'INACTIVE') return 'opacity-60';
    return undefined;
  }, []);

  const handleEvent = useCallback((event: any) => {
    counterRef.current++;
    if (counterRef.current % 5 === 0) {
      toast.info(`Event: ${event.type}`);
    }
  }, []);

  const features = {
    enablePagination: true,
    enableRowSelection: true,
    enableColumnPinning: true,
    enableSorting: true,
    showPanelHeader: true,
    showSidebarFilter: true,
    enableContextMenu: true,
    enableInlineEditing: true,
    enableExport: true,
    enableScanner: true,
    enableKeyboardNav: true,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 Enterprise CustomDataGrid</h1>
        {selection.length > 0 && (
          <span className="text-sm text-muted-foreground">{selection.length} selected</span>
        )}
      </div>

      <CustomDataGrid
        columns={columns}
        dataSource={dataSource}
        title="Users"
        features={features}
        pageSize={10}
        plugins={[SelectionPlugin() as any, ScannerPlugin({ onScan: (code) => toast.info(`Scanned: ${code}`) }) as any]}
        contextMenuItems={contextMenuItems}
        onSelectionChange={setSelection}
        onEvent={handleEvent}
        rowClassName={rowClassName}
        drawerTitle={(row) => `User: ${row.username}`}
        drawerContent={(row) => (
          <div className="space-y-3 text-sm">
            <div><strong>ID:</strong> {row.id}</div>
            <div><strong>Username:</strong> {row.username}</div>
            <div><strong>Email:</strong> {row.email}</div>
            <div><strong>Display Name:</strong> {row.displayName || '—'}</div>
            <div><strong>Status:</strong> {row.status}</div>
            <div><strong>Created:</strong> {new Date(row.createdAt).toLocaleString()}</div>
          </div>
        )}
        actionButtons={
          <button className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-accent"
            onClick={() => toast.success('Custom action triggered')}>
            + Add User
          </button>
        }
      />
    </div>
  );
}

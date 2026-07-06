import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, Skeleton } from '@platform/ui';

interface Item { id: string; username: string; email: string; status: string; createdAt: string; [key: string]: unknown; }

export function UsersPage() {
  const [selection, setSelection] = useState<Item[]>([]);
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const r = await fetch('/api/v1/users', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') } });
      const j = await r.json();
      const d = j?.data || j;
      return (d?.data || d || []) as Item[];
    },
  });
  const columns = useMemo(() => [
    { accessorKey: 'username', header: 'Username' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'createdAt', header: 'Created' },
  ], []);
  if (isLoading) return <div className="flex items-center justify-center py-16"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      <h1 className="text-2xl font-bold">Users</h1>
      <DataGrid columns={columns} data={data || []} title="Users" enableSelection enableRowNumber enableSorting enableColumnVisibility enableExport enableDensity onSelectionChange={setSelection} pageSize={15} pageSizeOptions={[10, 15, 25, 50, 100]} emptyMessage="No users found." />
    </div>
  );
}

import { useMemo, useState, useCallback } from 'react';
import { DataGrid, type DataGridColumn } from '@platform/ui';
import { toast } from '@platform/hooks';

interface DemoItem {
  id: string;
  code: string;
  name: string;
  category: string;
  status: string;
  quantity: number;
  price: number;
  location: string;
}

const statuses = ['ACTIVE', 'IN_USE', 'MAINTENANCE', 'RETIRED', 'DAMAGED', 'CALIBRATION'];
const categories = ['Jig-Frame', 'Jig-Base', 'Jig-Insert', 'Fixture', 'Pallet', 'Carrier', 'Gauge', 'Tool'];
const locations = ['Warehouse-A1', 'Line-01', 'Line-03', 'QC-Lab', 'Tool-Crib'];

function generateData(count: number): DemoItem[] {
  const data: DemoItem[] = [];
  for (let i = 1; i <= count; i++) {
    data.push({
      id: `JIG-${String(i).padStart(4, '0')}`,
      code: `JIG-${String(i).padStart(4, '0')}`,
      name: `Precision Fixture ${i}`,
      category: categories[i % categories.length]!,
      status: statuses[i % statuses.length]!,
      quantity: Math.floor(Math.random() * 50) + 1,
      price: Math.round((Math.random() * 9500 + 500) * 100) / 100,
      location: locations[i % locations.length]!,
    });
  }
  return data;
}

const mockData = generateData(100);

export function DataGridDemoPage() {
  const [selection, setSelection] = useState<DemoItem[]>([]);

  const columns = useMemo<DataGridColumn<DemoItem>[]>(() => [
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'category', header: 'Category' },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue() as string;
        return <span className="font-medium">{s}</span>;
      },
    },
    { accessorKey: 'quantity', header: 'Qty' },
    {
      accessorKey: 'price', header: 'Price',
      cell: ({ getValue }) => `$${Number(getValue()).toFixed(2)}`,
    },
    { accessorKey: 'location', header: 'Location' },
  ], []);

  const rowClassName = useCallback((row: DemoItem) => {
    if (row.status === 'DAMAGED') return 'bg-red-50';
    if (row.status === 'MAINTENANCE') return 'bg-yellow-50';
    return undefined;
  }, []);

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      <h1 className="text-2xl font-bold">📊 DataGrid — 100 Rows</h1>
      {selection.length > 0 && (
        <span className="text-sm text-muted-foreground">{selection.length} selected</span>
      )}
      <DataGrid
        columns={columns}
        data={mockData}
        title="Jig Inventory"
        enableSelection
        enableRowNumber
        enableSorting
        enableColumnVisibility
        enableExport
        enableDensity
        onSelectionChange={setSelection}
        onRowClick={(row) => toast.info(`Clicked: ${row.code}`)}
        classNames={{}}
        pageSize={15}
        pageSizeOptions={[10, 15, 25, 50, 100]}
        emptyMessage="No data"
      />
    </div>
  );
}

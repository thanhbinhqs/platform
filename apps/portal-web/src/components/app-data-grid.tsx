// AppDataGrid — Enhanced enterprise data grid with full filter sidebar + actions + pagination

import { useState, useMemo, type ReactNode } from 'react';
import { DataGrid, type DataGridColumn } from '@platform/ui';
import { Search, Download, Plus, Upload, RefreshCw, Filter, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface FilterField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multi-select' | 'checkbox' | 'date-range' | 'number-range';
  options?: { label: string; value: string }[];
  placeholder?: string;
}

interface ActiveFilter {
  field: string;
  operator: string;
  value: unknown;
}

interface BulkAction {
  label: string;
  icon?: ReactNode;
  onClick: (selectedIds: string[]) => void;
}

interface TableAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'default';
}

export interface AppDataGridProps<TData> {
  columns: DataGridColumn<TData>[];
  data: TData[];
  title?: string;
  filterFields?: FilterField[];
  bulkActions?: BulkAction[];
  tableActions?: TableAction[];
  enableSelection?: boolean;
  enableSorting?: boolean;
  enableExport?: boolean;
  enableColumnResize?: boolean;
  enableDensity?: boolean;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  onSelectionChange?: (rows: TData[]) => void;
  classNames?: { wrapper?: string; table?: string; header?: string; row?: string; cell?: string };
  emptyMessage?: string;
  loading?: boolean;
  onSearch?: (query: string) => void;
  serverSide?: {
    manualPagination?: boolean;
    manualSorting?: boolean;
    manualFiltering?: boolean;
    pageCount?: number;
    pagination?: { pageIndex: number; pageSize: number };
    onPaginationChange?: (p: { pageIndex: number; pageSize: number }) => void;
    onSortingChange?: (s: any[]) => void;
    onColumnFiltersChange?: (f: any[]) => void;
    onGlobalFilterChange?: (v: string) => void;
  };
}

// ─── Component ───────────────────────────────────────────────────

export function AppDataGrid<TData extends { id?: string | number }>({
  columns, data, title, filterFields = [], bulkActions = [], tableActions = [],
  enableSelection, enableSorting, enableExport, enableColumnResize, enableDensity,
  pageSize = 20, onRowClick, onSelectionChange,
  emptyMessage, loading, onSearch, serverSide,
}: AppDataGridProps<TData>) {
  const [showFilter, setShowFilter] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Bulk action dropdown ──
  const [showBulk, setShowBulk] = useState(false);

  const handleSelectionChange = (rows: TData[]) => {
    setSelectedIds(rows.map((r: any) => String(r.id)));
    onSelectionChange?.(rows);
  };

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    onSearch?.(val);
    if (serverSide?.onGlobalFilterChange) serverSide.onGlobalFilterChange(val);
  };

  // ── Add / Remove filters ──
  const addFilter = (field: FilterField) => {
    setActiveFilters([...activeFilters, { field: field.id || '', operator: 'contains', value: '' }]);
  };

  const removeFilter = (idx: number) => {
    setActiveFilters(activeFilters.filter((_, i) => i !== idx));
  };

  const updateFilter = (idx: number, field: string, val: unknown) => {
    const f = [...activeFilters];
    const existing = f[idx];
    if (!existing) return;
    f[idx] = { field: existing.field, operator: existing.operator, value: existing.value, [field]: val };
    setActiveFilters(f);
  };

  // ── Render filter sidebar ──
  const renderFilterSidebar = () => {
    if (!showFilter) return null;
    return (
      <div className="w-72 shrink-0 border-r bg-card overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-1"><Filter size={14} /> Filters</h3>
          <button className="rounded p-1 hover:bg-accent" onClick={() => setShowFilter(false)}><X size={14} /></button>
        </div>

        {/* Filter field selector */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Add filter</p>
          <div className="flex flex-wrap gap-1">
            {filterFields.filter(f => !activeFilters.find(af => af.field === f.id)).map(f => (
              <button key={f.id} className="rounded border px-2 py-0.5 text-xs hover:bg-accent" onClick={() => addFilter(f)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active filters */}
        {activeFilters.map((af, idx) => {
          const fieldDef = filterFields.find(f => f.id === af.field);
          if (!fieldDef) return null;
          return (
            <div key={idx} className="rounded-lg border p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{fieldDef.label}</span>
                <button className="rounded p-0.5 text-red-500 hover:bg-red-50" onClick={() => removeFilter(idx)}><X size={12} /></button>
              </div>
              {fieldDef.type === 'text' && (
                <input className="w-full rounded border bg-background px-2 py-1 text-xs" placeholder={fieldDef.placeholder || 'Filter...'}
                  value={String(af.value)} onChange={e => updateFilter(idx, 'value', e.target.value)} />
              )}
              {fieldDef.type === 'select' && fieldDef.options && (
                <select className="w-full rounded border bg-background px-2 py-1 text-xs" value={String(af.value)} onChange={e => updateFilter(idx, 'value', e.target.value)}>
                  <option value="">All</option>
                  {fieldDef.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              {fieldDef.type === 'multi-select' && fieldDef.options && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {fieldDef.options.map(o => (
                    <label key={o.value} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" className="h-3 w-3" checked={String(af.value).includes(o.value)}
                        onChange={() => {
                          const current = String(af.value);
                          const vals = current ? current.split(',') : [];
                          const idx2 = vals.indexOf(o.value);
                          if (idx2 >= 0) vals.splice(idx2, 1); else vals.push(o.value);
                          updateFilter(idx, 'value', vals.join(','));
                        }} />
                      {o.label}
                    </label>
                  ))}
                </div>
              )}
              {fieldDef.type === 'checkbox' && (
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" className="h-3 w-3" checked={Boolean(af.value)} onChange={e => updateFilter(idx, 'value', e.target.checked)} />
                  Enabled
                </label>
              )}
              {fieldDef.type === 'date-range' && (
                <div className="flex gap-1">
                  <input type="date" className="flex-1 rounded border bg-background px-2 py-1 text-xs" value={String(af.value).split(',')[0] || ''} onChange={e => updateFilter(idx, 'value', e.target.value + ',')} />
                  <input type="date" className="flex-1 rounded border bg-background px-2 py-1 text-xs" value={String(af.value).split(',')[1] || ''} onChange={e => updateFilter(idx, 'value', (String(af.value).split(',')[0] || '') + ',' + e.target.value)} />
                </div>
              )}
              {fieldDef.type === 'number-range' && (
                <div className="flex gap-1">
                  <input type="number" className="flex-1 rounded border bg-background px-2 py-1 text-xs" placeholder="Min" value={String(af.value).split(',')[0] || ''} onChange={e => updateFilter(idx, 'value', e.target.value + ',')} />
                  <input type="number" className="flex-1 rounded border bg-background px-2 py-1 text-xs" placeholder="Max" value={String(af.value).split(',')[1] || ''} onChange={e => updateFilter(idx, 'value', (String(af.value).split(',')[0] || '') + ',' + e.target.value)} />
                </div>
              )}
            </div>
          );
        })}
        {activeFilters.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No filters applied. Click a filter above to add.</p>
        )}

        {/* Apply/Clear */}
        {activeFilters.length > 0 && (
          <div className="flex gap-2 pt-2">
            <button className="flex-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90" onClick={() => {}}>Apply</button>
            <button className="rounded bg-muted px-3 py-1.5 text-xs hover:bg-accent" onClick={() => setActiveFilters([])}>Clear</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* Filter Sidebar */}
      {renderFilterSidebar()}

      {/* Main area */}
      <div className="flex flex-1 flex-col min-h-0">
        {/* Table header: Title + Bulk Actions + Actions */}
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 mb-2 shrink-0">
          <div className="flex items-center gap-3">
            {title && <h2 className="text-lg font-bold tracking-tight">{title}</h2>}
            {/* Bulk actions dropdown */}
            {selectedIds.length > 0 && bulkActions.length > 0 && (
              <div className="relative">
                <button className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-accent"
                  onClick={() => setShowBulk(!showBulk)}>
                  Bulk ({selectedIds.length}) ▾
                </button>
                {showBulk && (
                  <div className="absolute left-0 top-full mt-1 min-w-[160px] rounded-lg border bg-card py-1 shadow-xl z-50">
                    {bulkActions.map((a, i) => (
                      <button key={i} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                        onClick={() => { a.onClick(selectedIds); setShowBulk(false); }}>
                        {a.icon} {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <button className={`inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-accent ${showFilter ? 'bg-accent' : ''}`}
              onClick={() => setShowFilter(!showFilter)}><Filter size={14} /> Filters</button>
            <button className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-accent" onClick={() => handleSearch('')}><RefreshCw size={14} /></button>
            {tableActions.map((a, i) => (
              <button key={i} className={`inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium border bg-background hover:bg-accent ${a.variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                onClick={a.onClick}>
                {a.icon} {a.label}
              </button>
            ))}
            {enableExport && (
              <button className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-accent" onClick={() => {}}><Download size={14} /> Export</button>
            )}
          </div>
        </div>

        {/* DataGrid */}
        <DataGrid
          columns={columns}
          data={data}
          title=""
          enableSelection={enableSelection}
          enableSorting={enableSorting}
          enableColumnResize={enableColumnResize}
          enableExport={false}
          enableDensity={enableDensity}
          pageSize={pageSize}
          serverSide={serverSide as any}
          onRowClick={onRowClick}
          onSelectionChange={handleSelectionChange}
          emptyMessage={emptyMessage}
          isLoading={loading}
          searchPlaceholder={undefined}
          classNames={{ wrapper: 'flex-1 flex flex-col min-h-0' }}
        />
      </div>
    </div>
  );
}

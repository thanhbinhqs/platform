// AppDataGrid — Enhanced enterprise data grid with full filter sidebar + actions + pagination

import { useState, useMemo, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { DataGrid, type DataGridColumn } from '@platform/ui';
import { usePermission, hasPermission } from '@platform/hooks';
import { useAuthStore } from '@platform/hooks';
import { Search, Download, Plus, Upload, RefreshCw, Filter, X, Columns, SlidersHorizontal, Eye, EyeOff, Pencil, Trash2, ExternalLink } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface FilterField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multi-select' | 'checkbox' | 'date-range' | 'number-range';
  options?: { label: string; value: string }[];
  placeholder?: string;
  /** Required permission to see this filter field */
  permission?: string | string[];
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
  /** Required permission — action hidden if user lacks it */
  permission?: string | string[];
}

interface TableAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'default';
  /** Required permission — action hidden if user lacks it */
  permission?: string | string[];
}

/** Context menu item definition */
interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  action: string;
  /** Required permission — item hidden if user lacks it */
  permission?: string | string[];
  /** Disable condition (checked per row) */
  disabled?: boolean | ((row: Record<string, unknown>) => boolean);
  divider?: boolean;
  children?: ContextMenuItem[];
}

/** Recursively filter context menu items by permission */
function filterCtxItems(items: ContextMenuItem[], hasPerm: (p?: string | string[]) => boolean): ContextMenuItem[] {
  return items.reduce<ContextMenuItem[]>((acc, item) => {
    if (item.permission && !hasPerm(item.permission)) return acc;
    const cloned: ContextMenuItem = { ...item };
    if (item.children) cloned.children = filterCtxItems(item.children, hasPerm);
    acc.push(cloned);
    return acc;
  }, []);
}

export interface AppDataGridProps<TData> {
  columns: DataGridColumn<TData>[];
  data: TData[];
  title?: string;
  filterFields?: FilterField[];
  bulkActions?: BulkAction[];
  tableActions?: TableAction[];
  enableSelection?: boolean;
  enableRowNumber?: boolean;
  enableSorting?: boolean;
  enableExport?: boolean;
  enableColumnResize?: boolean;
  enableColumnVisibility?: boolean;
  enableDensity?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  total?: number;
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
  /** Context menu items shown on right-click */
  contextMenuItems?: ContextMenuItem[];
  /** Called when a context menu item is clicked */
  onContextMenuAction?: (action: string, row: TData) => void;
  /** Permission required to see Export button (e.g. 'export:rules') */
  exportPermission?: string | string[];
  /** Permission required to see Columns dropdown (e.g. 'columns:rules') */
  columnVisibilityPermission?: string | string[];
  /** Permission required to see Density dropdown */
  densityPermission?: string | string[];
}

// ─── Component ───────────────────────────────────────────────────

export function AppDataGrid<TData extends { id?: string | number }>({
  columns, data, title, filterFields = [], bulkActions = [], tableActions = [],
  enableSelection, enableRowNumber, enableSorting, enableExport, enableColumnResize, enableColumnVisibility, enableDensity,
  pageSize = 20, pageSizeOptions, total: extTotal, onRowClick, onSelectionChange,
  emptyMessage, loading, onSearch, serverSide,
  contextMenuItems = [], exportPermission, columnVisibilityPermission, densityPermission,
  onContextMenuAction,
}: AppDataGridProps<TData>) {
  const [showFilter, setShowFilter] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [colVis, setColVis] = useState<Record<string, boolean>>({});
  const [denKey, setDenKey] = useState('standard');
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; row: TData } | null>(null);

  const DENSITY_MAP: Record<string, { label: string }> = {
    compact: { label: 'Compact' },
    standard: { label: 'Standard' },
    comfortable: { label: 'Comfortable' },
  };

  // ── Bulk action dropdown ──
  const [showBulk, setShowBulk] = useState(false);
  const [showColMenu, setShowColMenu] = useState(false);
  const [showDenMenu, setShowDenMenu] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const denMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setShowColMenu(false);
      if (denMenuRef.current && !denMenuRef.current.contains(e.target as Node)) setShowDenMenu(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectionChange = useCallback((rows: TData[]) => {
    setSelectedIds(rows.map((r: any) => String(r.id)));
    onSelectionChange?.(rows);
  }, [onSelectionChange]);
  // NOTA BENE: Changes to onSelectionChange (from parent) are rare; React setState functions are stable.

  const handleSearch = useCallback((val: string) => {
    setSearchQuery(val);
    onSearch?.(val);
    if (serverSide?.onGlobalFilterChange) serverSide.onGlobalFilterChange(val);
  }, [onSearch, serverSide]);

  // ── Pagination callbacks (useCallback so DataGrid useEffect deps stay stable) ──
  const handleGridPageChange = useCallback((p: number) => {
    serverSide?.onPaginationChange?.({ pageIndex: p, pageSize });
  }, [serverSide, pageSize]);
  const handleGridPageSizeChange = useCallback((s: number) => {
    serverSide?.onPaginationChange?.({ pageIndex: 0, pageSize: s });
  }, [serverSide]);

  // ── Permission checking ──
  const userRules = useAuthStore((s) => s.user?.rules);
  const hasPerm = (perm?: string | string[]) => {
    if (!perm) return true; // No permission required
    return hasPermission(userRules, perm);
  };
  const canExport = enableExport && hasPerm(exportPermission);
  const canShowColVis = enableColumnVisibility && hasPerm(columnVisibilityPermission);
  const canShowDensity = enableDensity && hasPerm(densityPermission);

  // Filter actions / fields by permission
  const visibleFilterFields = useMemo(
    () => filterFields.filter(f => hasPerm(f.permission)),
    [filterFields, userRules],
  );
  const visibleBulkActions = useMemo(
    () => bulkActions.filter(a => hasPerm(a.permission)),
    [bulkActions, userRules],
  );
  const visibleTableActions = useMemo(
    () => tableActions.filter(a => hasPerm(a.permission)),
    [tableActions, userRules],
  );

  // Filter context menu items by permission
  const visibleContextMenuItems = useMemo(
    () => filterCtxItems(contextMenuItems, hasPerm),
    [contextMenuItems, userRules],
  );

  // ── Context menu action handler ──
  const handleCtxAction = useCallback((action: string, row: TData) => {
    onContextMenuAction?.(action, row);
    setCtxMenu(null);
  }, [contextMenuItems, onContextMenuAction]);

  // ── Add / Remove filters ──
  const addFilter = (field: FilterField) => {
    setActiveFilters([...activeFilters, { field: field.id || '', operator: 'contains', value: '' }]);
  };

  const removeFilter = (idx: number) => {
    setActiveFilters(activeFilters.filter((_, i) => i !== idx));
  };

  const updateFilter = (idx: number, field: string, val: unknown) => {
    setActiveFilters(prev => prev.map((f, i) => i === idx ? { ...f, [field]: val } : f));
  };

  // ── Connect sidebar activeFilters → TanStack columnFilters ──
  const dataGridColumnFilters = useMemo(() => {
    return activeFilters
      .filter(f => f.value !== '' && f.value !== undefined && f.value !== null)
      .map(f => ({ id: f.field, value: f.value }));
  }, [activeFilters]);

  const dataGridServerSide = useMemo(() => ({
    ...(serverSide || {}),
    manualFiltering: false,
    columnFilters: dataGridColumnFilters,
  }), [serverSide, dataGridColumnFilters]);

  // ── Render filter sidebar ──
  const renderFilterSidebar = () => {
    if (!showFilter) return null;
    return (
      <>
        {/* Overlay backdrop on mobile */}
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setShowFilter(false)} />
        <div className="fixed left-0 top-0 z-50 h-full w-72 border-r bg-card overflow-y-auto p-3 space-y-2 shadow-xl lg:static lg:z-auto lg:shadow-none lg:border-r lg:h-auto lg:overflow-visible lg:w-72 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-1"><Filter size={14} /> Filters</h3>
            <button className="rounded p-1 hover:bg-accent lg:hidden" onClick={() => setShowFilter(false)}><X size={14} /></button>
          </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search all…"
            className="h-8 w-full rounded-md border bg-background pl-8 pr-8 text-sm outline-none focus:border-primary"
            value={searchQuery} onChange={e => handleSearch(e.target.value)} />
          {searchQuery && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => handleSearch('')}><X size={14} /></button>}
        </div>

        {/* Filter field selector */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Add filter</p>
          <div className="flex flex-wrap gap-1.5">
            {visibleFilterFields.filter(f => !activeFilters.find(af => af.field === f.id)).map(f => (
              <button key={f.id}
                className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent hover:border-primary/40 transition-colors"
                onClick={() => addFilter(f)}>
                <span className="text-muted-foreground">+</span> {f.label}
              </button>
            ))}
            {visibleFilterFields.every(f => activeFilters.find(af => af.field === f.id)) && (
              <p className="text-xs text-muted-foreground italic">All filters added</p>
            )}
          </div>
        </div>

        {/* Active filters */}
        {activeFilters.map((af, idx) => {
          const fieldDef = visibleFilterFields.find(f => f.id === af.field);
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
            <button className="flex-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90" onClick={() => setActiveFilters(prev => [...prev])}>Apply</button>
            <button className="rounded bg-muted px-3 py-1.5 text-xs hover:bg-accent" onClick={() => setActiveFilters([])}>Clear</button>
          </div>
        )}
      </div>
      </>
    );
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* Filter Sidebar */}
      {renderFilterSidebar()}

      {/* Main area */}
      <div className="flex flex-1 flex-col min-h-0">
        {/* Table header: Title + Bulk Actions + Actions */}
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-1.5 mb-1 shrink-0">
          <div className="flex items-center gap-2">
            {title && <h2 className="text-sm font-bold tracking-tight">{title}</h2>}
            {/* Bulk actions dropdown */}
            {selectedIds.length > 0 && visibleBulkActions.length > 0 && (
              <div className="relative">
                <button className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-accent"
                  onClick={() => setShowBulk(!showBulk)}>
                  Bulk ({selectedIds.length}) ▾
                </button>
                {showBulk && (
                  <div className="absolute left-0 top-full mt-1 min-w-[160px] rounded-lg border bg-card py-1 shadow-xl z-50">
                    {visibleBulkActions.map((a, i) => (
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

          {/* Right: Actions + Settings */}
          <div className="flex items-center gap-1 ml-auto">
            <button className={`inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-accent ${showFilter ? 'bg-accent' : ''}`}
              onClick={() => setShowFilter(!showFilter)}><Filter size={14} /> Filters</button>
            <button className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-accent" onClick={() => handleSearch('')}><RefreshCw size={14} /></button>
            {visibleTableActions.map((a, i) => (
              <button key={i} className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium border bg-background hover:bg-accent ${a.variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                onClick={a.onClick}>
                {a.icon} {a.label}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-border" /> {/* Separator */}
            {canExport && (
              <button className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-accent" onClick={() => {}}><Download size={14} /> Export</button>
            )}
            {canShowColVis && (
              <div className="relative" ref={colMenuRef}>
                <button className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-accent"
                  onClick={() => setShowColMenu(!showColMenu)}><Columns size={14} /> Columns</button>
                {showColMenu && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-card shadow-xl">
                    <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">Column Visibility</div>
                    {columns.map((c, i) => {
                      const id = (c as any).accessorKey || (c as any).id || String(i);
                      const hdr = typeof (c as any).header === 'string' ? (c as any).header : id;
                      if (id.startsWith('__')) return null;
                      const vis = colVis[id] !== false;
                      return (
                        <button key={id} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                          onClick={() => setColVis({ ...colVis, [id]: !vis })}>
                          {vis ? <Eye size={14} /> : <EyeOff size={14} />} {hdr}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {canShowDensity && (
              <div className="relative" ref={denMenuRef}>
                <button className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-accent"
                  onClick={() => setShowDenMenu(!showDenMenu)}><SlidersHorizontal size={14} /> {DENSITY_MAP[denKey]?.label ?? 'Density'}</button>
                {showDenMenu && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border bg-card shadow-xl">
                    {Object.entries(DENSITY_MAP).map(([k, d]) => (
                      <button key={k} className={`flex w-full items-center px-3 py-1.5 text-sm hover:bg-accent ${denKey === k ? 'font-semibold text-primary' : ''}`}
                        onClick={() => { setDenKey(k); setShowDenMenu(false); }}>{d.label}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* DataGrid */}
        <DataGrid
          columns={columns}
          data={data}
          title=""
          enableSelection={enableSelection}
          enableRowNumber={enableRowNumber}
          enableSorting={enableSorting}
          enableColumnResize={enableColumnResize}
          enableExport={false}
          enableColumnVisibility={false}
          enableDensity={false}
          density={denKey as 'compact' | 'standard' | 'comfortable'}
          onDensityChange={(key: 'compact' | 'standard' | 'comfortable') => setDenKey(key)}
          columnVisibility={colVis}
          onColumnVisibilityChange={(v: any) => setColVis(v)}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          page={serverSide?.pagination?.pageIndex ?? 0}
          total={extTotal ?? data?.length ?? 0}
          onPageChange={handleGridPageChange}
          onPageSizeChange={handleGridPageSizeChange}
          serverSide={dataGridServerSide as any}
          onRowClick={(row) => {
            // If we have context menu items, set row for menu
            if (contextMenuItems.length > 0) {
              // Don't navigate, let context menu handle it
            }
            onRowClick?.(row);
          }}
          onRowContextMenu={(row, pos) => setCtxMenu({ ...pos, row })}
          onSelectionChange={handleSelectionChange}
          emptyMessage={emptyMessage}
          isLoading={loading}
          searchPlaceholder={undefined}
          classNames={{ wrapper: 'flex-1 flex flex-col min-h-0' }}
        />

        {/* Context Menu */}
        {ctxMenu && visibleContextMenuItems.length > 0 && (
          <div
            ref={menuRef}
            style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 9999 }}
            className="min-w-[180px] rounded-lg border bg-card py-1 shadow-xl"
            role="menu">
            {visibleContextMenuItems.map((item, i) => (
              <div key={i}>
                {item.divider && <div className="my-1 border-t" />}
                <button
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                  onClick={() => {
                    handleCtxAction(item.action, ctxMenu.row);
                  }}>
                  {item.icon && <span className="text-base">{item.icon}</span>}
                  {item.label}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

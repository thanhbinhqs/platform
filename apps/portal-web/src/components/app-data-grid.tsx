// AppDataGrid — Enhanced enterprise data grid with full filter sidebar + actions + pagination

import { useState, useMemo, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { DataGrid, type DataGridColumn } from '@platform/ui';
import { usePermission, hasPermission } from '@platform/hooks';
import { useAuthStore, useMediaQuery } from '@platform/hooks';
import { Search, Download, Plus, Upload, RefreshCw, Filter, X, Columns, SlidersHorizontal, Eye, EyeOff, Pin, Pencil, Trash2, ExternalLink, Settings } from 'lucide-react';
import { InstantSearchControl } from './filters/instant-search-control';
import { BoundarySearchControl } from './filters/boundary-search-control';

// ─── Types ───────────────────────────────────────────────────────

interface FilterField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multi-select' | 'checkbox' | 'date-range' | 'number-range'
    | 'date' | 'number' | 'email' | 'url' | 'phone' | 'boolean'
    | 'date-time-range' | 'date-time' | 'time-range' | 'tags' | 'entity'
    | 'instant-search' | 'boundary-search';
  options?: { label: string; value: string }[];
  placeholder?: string;
  /** Required permission to see this filter field */
  permission?: string | string[];
  /** Enable multi-select mode (default: false) */
  multiple?: boolean;
  /** API endpoint for instant-search / boundary-search (e.g. '/api/v1/roles/search') */
  endpoint?: string;
  /** Field name to display in suggestion list (e.g. 'username', 'name') */
  displayField?: string;
  /** Field name to use as filter value (default: 'id') */
  valueField?: string;
  /** Input type for boundary-search: 'text' | 'number' | 'date' | 'time' (default: 'text') */
  inputType?: 'text' | 'number' | 'date' | 'time';
  /** Request debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Max results to fetch (default: 10) */
  resultLimit?: number;
  /** Min value / boundary start (for boundary-search, number) */
  boundaryMin?: number | string;
  /** Max value / boundary end (for boundary-search, number) */
  boundaryMax?: number | string;
  /** Entity type for entity selector */
  entityType?: string;
  /** Step value for number input */
  step?: number;
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
  label?: string;
  icon?: ReactNode;
  action?: string;
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
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
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
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [columnSticky, setColumnSticky] = useState<Record<string, 'left' | 'right' | null>>({});
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Close menus on click outside
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) setShowSettingsMenu(false);
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

  // ── Filter values ──
  const updateFilterValue = (fieldId: string, val: unknown) => {
    setFilterValues(prev => ({ ...prev, [fieldId]: val }));
  };

  const clearFilters = () => {
    setFilterValues({});
  };

  // ── Connect sidebar filterValues → TanStack columnFilters ──
  const dataGridColumnFilters = useMemo(() => {
    return Object.entries(filterValues)
      .filter(([_, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0))
      .map(([id, value]) => ({ id, value }));
  }, [filterValues]);

  const dataGridServerSide = useMemo(() => ({
    ...(serverSide || {}),
    manualFiltering: false,
    columnFilters: dataGridColumnFilters,
  }), [serverSide, dataGridColumnFilters]);

  // ── Render filter sidebar ──
  const renderFilterSidebar = () => {
    if (!showFilter) return null;
    const hasAnyValue = Object.values(filterValues).some(v => v !== '' && v !== undefined && v !== null);
    return (
      <>
        {/* Overlay backdrop on mobile */}
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setShowFilter(false)} />
        <div className="fixed left-0 top-0 z-50 h-full w-full max-w-full sm:w-80 border-r bg-card overflow-y-auto shadow-xl lg:static lg:z-auto lg:shadow-none lg:border-r lg:h-auto lg:overflow-visible lg:w-72 shrink-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 shrink-0">
            <h3 className="font-semibold text-sm flex items-center gap-1"><Filter size={14} /> Filters</h3>
            <button className="rounded p-1 hover:bg-accent lg:hidden" onClick={() => setShowFilter(false)}><X size={14} /></button>
          </div>

          {/* Search */}
          <div className="px-3 pb-2 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search all…"
                className="h-8 w-full rounded-md border bg-background pl-8 pr-8 text-sm outline-none focus:border-primary"
                value={searchQuery} onChange={e => handleSearch(e.target.value)} />
              {searchQuery && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => handleSearch('')}><X size={14} /></button>}
            </div>
          </div>

          {/* All filter fields shown directly */}
          <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-3 min-h-0">
            {visibleFilterFields.map(field => {
              const val = filterValues[field.id] ?? '';
              return (
                <div key={field.id} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                  {field.type === 'text' && (
                    <input className="w-full rounded border bg-background px-2 py-1.5 text-xs max-sm:py-2.5 max-sm:min-h-[36px]" placeholder={field.placeholder || `Filter by ${field.label.toLowerCase()}...`}
                      value={String(val)} onChange={e => updateFilterValue(field.id, e.target.value)} />
                  )}
                  {field.type === 'select' && field.options && (
                    field.multiple ? (
                      <div className="max-h-40 overflow-y-auto space-y-1 rounded border bg-background p-2">
                        {field.options.map(o => (
                          <label key={o.value} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                            <input type="checkbox" className="h-3 w-3 rounded border-gray-300"
                              checked={String(val).split(',').includes(o.value)}
                              onChange={() => {
                                const current = val ? String(val).split(',').filter(Boolean) : [];
                                const idx = current.indexOf(o.value);
                                if (idx >= 0) current.splice(idx, 1);
                                else current.push(o.value);
                                updateFilterValue(field.id, current.join(','));
                              }} />
                            <span>{o.label}</span>
                          </label>
                        ))}
                        {String(val).split(',').filter(Boolean).length > 0 && (
                          <div className="flex items-center justify-between border-t pt-1 mt-1">
                            <span className="text-[10px] text-muted-foreground">{String(val).split(',').filter(Boolean).length} selected</span>
                            <button className="text-[10px] text-red-500 hover:text-red-700" onClick={() => updateFilterValue(field.id, '')}>Clear</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <select className="w-full rounded border bg-background px-2 py-1.5 text-xs" value={String(val)} onChange={e => updateFilterValue(field.id, e.target.value)}>
                        <option value="">All</option>
                        {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    )
                  )}
                  {field.type === 'multi-select' && field.options && (
                    <div className="max-h-32 overflow-y-auto space-y-1 rounded border bg-background p-2">
                      {field.options.map(o => (
                        <label key={o.value} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" className="h-3 w-3" checked={String(val).includes(o.value)}
                            onChange={() => {
                              const vals = val ? String(val).split(',') : [];
                              const idx = vals.indexOf(o.value);
                              if (idx >= 0) vals.splice(idx, 1); else vals.push(o.value);
                              updateFilterValue(field.id, vals.join(','));
                            }} />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  )}
                  {field.type === 'checkbox' && (
                    <label className="flex items-center gap-2 text-xs rounded border bg-background px-2 py-1.5">
                      <input type="checkbox" className="h-3 w-3" checked={Boolean(val)} onChange={e => updateFilterValue(field.id, e.target.checked)} />
                      Enabled
                    </label>
                  )}
                  {field.type === 'date-range' && (
                    <div className="flex gap-1">
                      <input type="date" className="flex-1 rounded border bg-background px-2 py-1.5 text-xs" value={String(val).split(',')[0] || ''} onChange={e => updateFilterValue(field.id, e.target.value + ',')} />
                      <input type="date" className="flex-1 rounded border bg-background px-2 py-1.5 text-xs" value={String(val).split(',')[1] || ''} onChange={e => updateFilterValue(field.id, (String(val).split(',')[0] || '') + ',' + e.target.value)} />
                    </div>
                  )}
                  {field.type === 'number-range' && (
                    <div className="flex gap-1">
                      <input type="number" className="flex-1 rounded border bg-background px-2 py-1.5 text-xs" placeholder="Min" value={String(val).split(',')[0] || ''} onChange={e => updateFilterValue(field.id, e.target.value + ',')} />
                      <input type="number" className="flex-1 rounded border bg-background px-2 py-1.5 text-xs" placeholder="Max" value={String(val).split(',')[1] || ''} onChange={e => updateFilterValue(field.id, (String(val).split(',')[0] || '') + ',' + e.target.value)} />
                    </div>
                  )}
                  {field.type === 'date' && (
                    <input type="date" className="w-full rounded border bg-background px-2 py-1.5 text-xs"
                      value={String(val)} onChange={e => updateFilterValue(field.id, e.target.value)} />
                  )}
                  {field.type === 'number' && (
                    <input type="number" className="w-full rounded border bg-background px-2 py-1.5 text-xs"
                      placeholder={field.placeholder || 'Number...'}
                      min={field.boundaryMin} max={field.boundaryMax} step={field.step}
                      value={String(val)} onChange={e => updateFilterValue(field.id, e.target.value)} />
                  )}
                  {field.type === 'email' && (
                    <input type="email" className="w-full rounded border bg-background px-2 py-1.5 text-xs"
                      placeholder={field.placeholder || 'Email...'}
                      value={String(val)} onChange={e => updateFilterValue(field.id, e.target.value)} />
                  )}
                  {field.type === 'url' && (
                    <input type="url" className="w-full rounded border bg-background px-2 py-1.5 text-xs"
                      placeholder={field.placeholder || 'https://...'}
                      value={String(val)} onChange={e => updateFilterValue(field.id, e.target.value)} />
                  )}
                  {field.type === 'phone' && (
                    <input type="tel" className="w-full rounded border bg-background px-2 py-1.5 text-xs"
                      placeholder={field.placeholder || '+84...'}
                      value={String(val)} onChange={e => updateFilterValue(field.id, e.target.value)} />
                  )}
                  {field.type === 'boolean' && (
                    <select className="w-full rounded border bg-background px-2 py-1.5 text-xs"
                      value={String(val)} onChange={e => updateFilterValue(field.id, e.target.value)}>
                      <option value="">All</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  )}
                  {field.type === 'date-time-range' && (
                    <div className="flex gap-1">
                      <input type="datetime-local" className="flex-1 rounded border bg-background px-2 py-1.5 text-xs"
                        value={String(val).split(',')[0] || ''}
                        onChange={e => updateFilterValue(field.id, e.target.value + ',')} />
                      <input type="datetime-local" className="flex-1 rounded border bg-background px-2 py-1.5 text-xs"
                        value={String(val).split(',')[1] || ''}
                        onChange={e => updateFilterValue(field.id, (String(val).split(',')[0] || '') + ',' + e.target.value)} />
                    </div>
                  )}
                  {field.type === 'date-time' && (
                    <input type="datetime-local" className="w-full rounded border bg-background px-2 py-1.5 text-xs"
                      value={String(val)} onChange={e => updateFilterValue(field.id, e.target.value)} />
                  )}
                  {field.type === 'time-range' && (
                    <div className="flex gap-1">
                      <input type="time" className="flex-1 rounded border bg-background px-2 py-1.5 text-xs"
                        value={String(val).split(',')[0] || ''}
                        onChange={e => updateFilterValue(field.id, e.target.value + ',')} />
                      <input type="time" className="flex-1 rounded border bg-background px-2 py-1.5 text-xs"
                        value={String(val).split(',')[1] || ''}
                        onChange={e => updateFilterValue(field.id, (String(val).split(',')[0] || '') + ',' + e.target.value)} />
                    </div>
                  )}
                  {field.type === 'tags' && (
                    <div className="space-y-1">
                      {val && String(val).split(',').filter(Boolean).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {String(val).split(',').filter(Boolean).map((tag: string, ti: number) => (
                            <span key={ti} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium">
                              {tag}
                              <button className="rounded-full p-0.5 hover:bg-primary/20" onClick={() => {
                                const tags = String(val).split(',').filter(Boolean);
                                tags.splice(ti, 1);
                                updateFilterValue(field.id, tags.join(','));
                              }}><X size={10} /></button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1">
                        <input type="text" className="flex-1 rounded border bg-background px-2 py-1.5 text-xs"
                          placeholder={field.placeholder || 'Type and press comma...'}
                          value={String(val).split(',').pop() || ''}
                          onChange={e => {
                            const input = e.target.value;
                            if (input.endsWith(',') || input.endsWith('\uff0c')) {
                              const existing = val ? String(val).split(',').filter(Boolean) : [];
                              const newTag = input.slice(0, -1).trim();
                              if (newTag && !existing.includes(newTag)) existing.push(newTag);
                              updateFilterValue(field.id, existing.join(',') + ',');
                            } else {
                              const existing = val ? String(val).split(',').filter(Boolean).slice(0, -1) : [];
                              existing.push(input);
                              updateFilterValue(field.id, existing.join(','));
                            }
                          }} />
                      </div>
                    </div>
                  )}
                  {field.type === 'entity' && (
                    <input type="text" className="w-full rounded border bg-background px-2 py-1.5 text-xs"
                      placeholder={field.placeholder || `Search ${field.entityType || 'entity'}...`}
                      value={String(val)} onChange={e => updateFilterValue(field.id, e.target.value)} />
                  )}
                  {field.type === 'instant-search' && (
                    <InstantSearchControl
                      endpoint={field.endpoint || '/api/v1/users'}
                      displayField={field.displayField}
                      valueField={field.valueField}
                      debounceMs={field.debounceMs}
                      resultLimit={field.resultLimit}
                      value={String(val)}
                      onChange={v => updateFilterValue(field.id, v)}
                      placeholder={field.placeholder || `Search ${field.label.toLowerCase()}...`}
                      multiple={field.multiple}
                    />
                  )}
                  {field.type === 'boundary-search' && (
                    <BoundarySearchControl
                      endpoint={field.endpoint}
                      displayField={field.displayField}
                      valueField={field.valueField}
                      boundaryMin={field.boundaryMin}
                      boundaryMax={field.boundaryMax}
                      value={String(val)}
                      onChange={v => updateFilterValue(field.id, v)}
                      fromPlaceholder={field.placeholder || 'From'}
                      toPlaceholder="To"
                      inputType={field.inputType || 'text'}
                      multiple={field.multiple}
                    />
                  )}
                </div>
              );
            })}
            {visibleFilterFields.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No filters available.</p>
            )}
          </div>

          {/* Apply/Clear at bottom */}
          <div className="flex gap-2 border-t p-3 shrink-0">
            <button className="flex-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                // Force re-evaluate by updating state reference (already live, but gives user feedback)
                setFilterValues(prev => ({ ...prev }));
              }}>Apply</button>
            <button className="flex-1 rounded bg-muted px-3 py-1.5 text-xs hover:bg-accent"
              onClick={clearFilters}>Clear</button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* Filter Sidebar */}
      {renderFilterSidebar()}

      {/* Main area */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        {/* Table header: Title + Bulk Actions + Actions */}
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-1.5 mb-1 shrink-0">
          <div className="flex items-center gap-2">
            <button className={`inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-xs font-medium hover:bg-accent ${showFilter ? 'bg-accent text-primary' : ''}`}
              onClick={() => setShowFilter(!showFilter)} title={showFilter ? 'Hide filters' : 'Show filters'}><Filter size={14} /></button>
            {title && <h2 className="text-sm font-bold tracking-tight">{title}</h2>}
            {/* Bulk actions dropdown */}
            {selectedIds.length > 0 && visibleBulkActions.length > 0 && (
              <div className={`relative ${isMobile ? 'lg:block hidden' : ''}`}>
                <button className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-accent"
                  onClick={() => setShowBulk(!showBulk)}>
                  Bulk ({selectedIds.length}) ▾
                </button>
                {showBulk && !isMobile && (
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
          <div className="flex items-center gap-1 ml-auto max-sm:gap-0">
            {isMobile ? (
              <>
                {visibleTableActions.filter(a => a.variant === 'primary').length > 0 && (
                  <button className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={visibleTableActions.find(a => a.variant === 'primary')!.onClick}
                    title={visibleTableActions.find(a => a.variant === 'primary')!.label}>
                    {visibleTableActions.find(a => a.variant === 'primary')!.icon || <Plus size={14} />}
                  </button>
                )}
                {(visibleTableActions.length > 0 || visibleBulkActions.length > 0 || canExport || canShowColVis || canShowDensity) && (
                  <div className="relative">
                    <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-xs font-medium hover:bg-accent"
                      onClick={() => setShowBulk(prev => !prev)} title="More actions">⁝</button>
                    {showBulk && (
                      <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowBulk(false)}>
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-card p-2 shadow-xl animate-slide-up max-h-[70vh] flex flex-col"
                          onClick={e => e.stopPropagation()}>
                          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted shrink-0" />
                          <div className="overflow-y-auto flex-1 min-h-0">
                            {/* Refresh */}
                            <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors hover:bg-accent"
                              onClick={() => { handleSearch(''); setShowBulk(false); }}><RefreshCw size={16} /> Refresh</button>
                            {visibleTableActions.length > 0 && <div className="mx-4 my-1 border-t" />}
                            {/* Table actions */}
                            {visibleTableActions.map((a, i) => (
                              <button key={i} className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors hover:bg-accent ${a.variant === 'primary' ? 'font-semibold text-primary' : ''}`}
                                onClick={() => { a.onClick(); setShowBulk(false); }}>{a.icon} {a.label}</button>
                            ))}
                            {visibleTableActions.length > 0 && visibleBulkActions.length > 0 && <div className="mx-4 my-1 border-t" />}
                            {/* Bulk actions */}
                            {visibleBulkActions.map((a, i) => (
                              <button key={i} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors hover:bg-accent"
                                onClick={() => { a.onClick(selectedIds); setShowBulk(false); }}>{a.icon} {a.label}</button>
                            ))}
                            {(visibleBulkActions.length > 0 || visibleTableActions.length > 0) && <div className="mx-4 my-1 border-t" />}
                            {/* Export */}
                            {canExport && (
                              <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors hover:bg-accent"
                                onClick={() => { setShowBulk(false); }}><Download size={16} /> Export</button>
                            )}
                            <div className="mx-4 my-1 border-t" />
                            {/* Settings */}
                            {(canShowColVis || canShowDensity) && (
                              <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
                                onClick={() => { setShowBulk(false); setShowSettingsMenu(true); }}>
                                <Settings size={16} /> Table Settings
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Mobile settings bottom sheet (separate from overflow menu) */}
                    {showSettingsMenu && (canShowColVis || canShowDensity) && (
                      <div className="fixed inset-0 z-[60]" onClick={() => setShowSettingsMenu(false)}>
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] rounded-t-xl bg-card p-4 shadow-xl flex flex-col"
                          onClick={e => e.stopPropagation()}>
                          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted shrink-0" />
                          {canShowColVis && (
                            <>
                              <div className="flex items-center gap-1.5 px-1 py-2 text-xs font-semibold text-muted-foreground shrink-0">
                                <Columns size={13} /> Column Settings
                              </div>
                              <div className="overflow-y-auto py-1 flex-1 min-h-0 space-y-0.5">
                                {columns.map((c, i) => {
                                  const id = (c as any).accessorKey || (c as any).id || String(i);
                                  const hdr = typeof (c as any).header === 'string' ? (c as any).header : id;
                                  if (id.startsWith('__')) return null;
                                  const vis = colVis[id] !== false;
                                  return (
                                    <label key={id} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-accent cursor-pointer">
                                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={vis}
                                        onChange={() => setColVis({ ...colVis, [id]: !vis })} />
                                      <span className={`flex-1 ${vis ? 'text-foreground' : 'text-muted-foreground/50 line-through'}`}>{hdr}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </>
                          )}
                          {canShowDensity && (
                            <>
                              {canShowColVis && <div className="border-t my-2 shrink-0" />}
                              <div className="px-1 py-2 shrink-0">
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                                  <SlidersHorizontal size={13} /> Density
                                </p>
                                <div className="flex gap-2">
                                  {Object.entries(DENSITY_MAP).map(([k, d]) => (
                                    <button key={k}
                                      className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium border transition-colors ${
                                        denKey === k
                                          ? 'bg-primary text-primary-foreground border-primary'
                                          : 'bg-background hover:bg-accent border-border'
                                      }`}
                                      onClick={() => { setDenKey(k); }}>
                                      {d.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <button className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-accent" onClick={() => handleSearch('')}><RefreshCw size={14} /></button>
                {visibleTableActions.map((a, i) => (
                  <button key={i} className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium border bg-background hover:bg-accent ${a.variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                    onClick={a.onClick}>
                    {a.icon} {a.label}
                  </button>
                ))}
                <span className="mx-1 h-5 w-px bg-border" />
                {canExport && (
                  <button className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-accent" onClick={() => {}}><Download size={14} /> Export</button>
                )}
                {(canShowColVis || canShowDensity) && (
                  <div className="relative" ref={settingsMenuRef}>
                    <button className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-xs font-medium hover:bg-accent"
                      onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                      title="Table settings"><Settings size={14} /></button>
                    {showSettingsMenu && (
                      <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border bg-card shadow-xl max-h-[80vh] flex flex-col">
                        {canShowColVis && (
                          <>
                            <div className="flex items-center gap-1.5 border-b px-3 py-2 text-xs font-semibold text-muted-foreground shrink-0">
                              <Columns size={13} /> Column Settings
                            </div>
                            <div className="overflow-y-auto py-1 shrink min-h-0 flex-1">
                              {columns.map((c, i) => {
                                const id = (c as any).accessorKey || (c as any).id || String(i);
                                const hdr = typeof (c as any).header === 'string' ? (c as any).header : id;
                                if (id.startsWith('__')) return null;
                                const vis = colVis[id] !== false;
                                const stickyPos = columnSticky[id] ?? null;
                                return (
                                  <div key={id} className="flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-accent/30 group">
                                    <button className="shrink-0 rounded p-1 text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors" title={vis ? 'Hide' : 'Show'}
                                      onClick={() => setColVis({ ...colVis, [id]: !vis })}>
                                      {vis ? <Eye size={13} /> : <EyeOff size={13} />}
                                    </button>
                                    <span className={`flex-1 truncate text-xs ${vis ? 'text-foreground' : 'text-muted-foreground/40 line-through'}`}>{hdr}</span>
                                    {vis && (
                                      <div className="flex items-center border rounded-md overflow-hidden shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button
                                          className={`inline-flex items-center gap-1 px-1.5 py-1 text-[11px] font-medium leading-none transition-colors
                                            ${stickyPos === 'left' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground/50 hover:bg-accent hover:text-foreground'}`}
                                          title="Pin left"
                                          onClick={() => setColumnSticky({ ...columnSticky, [id]: stickyPos === 'left' ? null : 'left' })}>
                                          <Pin size={10} /><span>Left</span>
                                        </button>
                                        <div className="w-px h-4 bg-border shrink-0" />
                                        <button
                                          className={`inline-flex items-center gap-1 px-1.5 py-1 text-[11px] font-medium leading-none transition-colors
                                            ${stickyPos === 'right' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground/50 hover:bg-accent hover:text-foreground'}`}
                                          title="Pin right"
                                          onClick={() => setColumnSticky({ ...columnSticky, [id]: stickyPos === 'right' ? null : 'right' })}>
                                          <Pin size={10} className="rotate-90" /><span>Right</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                        {canShowDensity && (
                          <>
                            {canShowColVis && <div className="border-t shrink-0" />}
                            <div className="px-3 py-2 shrink-0">
                              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                                <SlidersHorizontal size={13} /> Density
                              </p>
                              <div className="flex gap-1">
                                {Object.entries(DENSITY_MAP).map(([k, d]) => (
                                  <button key={k}
                                    className={`flex-1 rounded px-2 py-1 text-xs font-medium border transition-colors ${
                                      denKey === k
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background hover:bg-accent border-border'
                                    }`}
                                    onClick={() => { setDenKey(k); }}>
                                    {d.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
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
          enableDensity={false}
          density={denKey as 'compact' | 'standard' | 'comfortable'}
          onDensityChange={(key: 'compact' | 'standard' | 'comfortable') => setDenKey(key)}
          columnVisibility={colVis}
          onColumnVisibilityChange={(v: any) => setColVis(v)}
          columnStickyState={columnSticky}
          onColumnStickyChange={setColumnSticky}
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
          onRowContextMenu={(row: any, pos: { x: number; y: number }) => setCtxMenu({ ...pos, row })}
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
                    const action = item.action;
                    if (action) handleCtxAction(action, ctxMenu.row);
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

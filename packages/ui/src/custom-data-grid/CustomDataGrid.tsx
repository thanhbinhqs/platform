// @ts-nocheck
// CustomDataGrid — Main component
// Combines all sub-components with TanStack Table + plugin architecture

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createGridStore, GridProvider, useGridSelector } from './store';
import { mergePluginHooks } from './plugin';
import { GridEventBus } from './event-bus';
import { GridPermissionEngine } from './permission';
import { defaultTheme, themeToTailwind } from './theme';
import { RestDataSource, LocalDataSource } from './datasource';
import { PanelHeader } from './components/panel-header';
import { PaginationBar } from './components/pagination-bar';
import { ContextMenu } from './components/context-menu';
import { FilterSidebar } from './components/filter-sidebar';
import { DetailDrawer } from './components/detail-drawer';
import { VirtualTable } from './components/virtual-table';
import type {
  GridFeatures, GridThemeTokens, IDataSource, GridPlugin,
  ContextMenuItem, SortModel, GridRequest, GridResponse,
} from './types';
import { GridEventType } from './types';

const DENSITY_MAP: Record<string, { row: string; cell: string; font: string }> = {
  compact:      { row: 'py-0.5', cell: 'px-2 py-1',   font: 'text-xs' },
  standard:     { row: 'py-1',   cell: 'px-3 py-2',   font: 'text-sm' },
  comfortable:  { row: 'py-2',   cell: 'px-4 py-3',   font: 'text-sm' },
};

// ─── Props ───────────────────────────────────────────────────────

export interface CustomDataGridProps<TData> {
  columns: any[];
  data?: TData[];
  dataSource?: IDataSource<TData>;
  title?: string;
  features?: GridFeatures;
  theme?: GridThemeTokens;
  pageSize?: number;
  pageSizeOptions?: number[];
  plugins?: GridPlugin<any>[];
  contextMenuItems?: ContextMenuItem[];
  onRowClick?: (row: TData) => void;
  onSelectionChange?: (rows: TData[]) => void;
  onEvent?: (event: any) => void;
  rowClassName?: (row: TData) => string | undefined;
  emptyMessage?: string;
  searchPlaceholder?: string;
  bulkActions?: React.ReactNode;
  actionButtons?: React.ReactNode;
  drawerTitle?: (row: TData) => string;
  drawerContent?: (row: TData) => React.ReactNode;
}

// ─── Inner Grid Component ────────────────────────────────────────

function GridInner<TData extends { [key: string]: any; id?: string | number }>(props: CustomDataGridProps<TData>) {
  const store = useGridSelector(s => s);
  const {
    columns, title, features = {}, pageSize = 20, pageSizeOptions = [10, 20, 50, 100],
    plugins = [], contextMenuItems = [], onRowClick, onSelectionChange, onEvent,
    rowClassName, emptyMessage = 'No data found.', searchPlaceholder = 'Search…',
    bulkActions, actionButtons, drawerTitle, drawerContent,
  } = props;

  const [sorting, setSorting] = useState<any[]>([]);
  const [colVis, setColVis] = useState<Record<string, boolean>>({});
  const [rowSel, setRowSel] = useState<Record<string, boolean>>({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [ctxRow, setCtxRow] = useState<any>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<any>(null);
  const [localFilters, setLocalFilters] = useState<any[]>([]);
  const [dataState, setDataState] = useState<TData[]>(props.data || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSizeState, setPageSizeState] = useState(pageSize);
  const [density, setDensity] = useState('standard');

  const ds = props.dataSource;
  const busRef = useRef(new GridEventBus());
  const bus = busRef.current;

  // ── Load data ──
  const loadData = useCallback(async (overridePage?: number) => {
    if (!ds && !props.data) return;
    setLoading(true);
    setError(null);
    try {
      if (ds) {
        const req: GridRequest = {
          page: overridePage ?? page,
          pageSize: pageSizeState,
          sorts: sorting as any,
          globalSearch,
        };
        // Apply plugin hooks
        const hooks = mergePluginHooks(plugins);
        const finalReq = hooks.beforeLoad ? hooks.beforeLoad(req) : req;
        const resp = await ds.load(finalReq);
        const finalResp = hooks.afterLoad ? hooks.afterLoad(resp) : resp;
        setDataState(finalResp.data as TData[]);
        setTotal(finalResp.total);
        setPage(finalResp.page);
      }
    } catch (e: any) {
      setError(e?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [ds, props.data, page, pageSizeState, sorting, globalSearch, plugins]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived ──
  const selectedIds = Object.keys(rowSel).filter(k => rowSel[k]);
  const den = (DENSITY_MAP[density] ?? DENSITY_MAP.standard)!;

  const headerColumns = useMemo(() =>
    columns.map((c: any) => ({ id: c.accessorKey || c.id || '', header: typeof c.header === 'string' ? c.header : c.accessorKey || '' })),
    [columns]);

  const isServerSide = !!ds;

  // ── Scanner handler ──
  useEffect(() => {
    let buf = '';
    let t: any;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && buf.length > 2) {
        bus.emit(GridEventType.ScannerDetected, buf);
        const found = dataState.find((d: any) =>
          Object.values(d).some(v => String(v).includes(buf))
        );
        if (found) setRowSel({ [String(found.id)]: true });
        buf = '';
        return;
      }
      if (e.key.length === 1) buf += e.key;
      clearTimeout(t);
      t = setTimeout(() => { buf = ''; }, 200);
    };
    if (!features.enableScanner) return;
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); clearTimeout(t); };
  }, [features.enableScanner, dataState, bus]);

  // ── Notify selection changes ──
  useEffect(() => {
    const rows = dataState.filter(d => rowSel[String(d.id)]);
    onSelectionChange?.(rows);
    bus.emit(GridEventType.RowSelected, rows);
  }, [rowSel]);

  // ── Notify external events ──
  useEffect(() => {
    if (!onEvent) return;
    const unsub = bus.on(GridEventType as any, (e: any) => onEvent(e));
    return unsub;
  }, [onEvent, bus]);

  // ── Context menu action ──
  const handleCtxAction = useCallback((action: string, row: any) => {
    bus.emit(GridEventType as any, { action, row });
    if (action === 'edit') { setEditingCell({ row: 0, col: 'id' }); }
    if (action === 'delete' && ds?.delete) { ds.delete(row.id).then(() => loadData()); }
  }, [ds, loadData, bus]);

  // ── Render ──
  const themeVars = themeToTailwind(props.theme ?? defaultTheme);

  return (
    <div className="space-y-2" style={themeVars as any}>
      {/* Panel Header */}
      {(features.showPanelHeader !== false) && (
        <PanelHeader
          title={title}
          globalSearch={globalSearch}
          onSearchChange={v => { setGlobalSearch(v); }}
          columns={headerColumns}
          visibility={colVis}
          onVisibilityChange={setColVis}
          density={density}
          onDensityChange={setDensity}
          selectedCount={selectedIds.length}
          bulkActions={bulkActions}
          actionButtons={actionButtons}
          onExport={features.enableExport ? () => {
            bus.emit(GridEventType.ExportStarted, { format: 'csv' });
            // Simple CSV export
            const headers = columns.map((c: any) => c.accessorKey || c.id || '').filter(Boolean);
            const rows = dataState.map((r: any) => headers.map((h: string) => String(r[h] ?? '')).join(','));
            const csv = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title || 'export'}.csv`; a.click();
            bus.emit(GridEventType.ExportCompleted, { format: 'csv', rows: dataState.length });
          } : undefined}
          searchPlaceholder={searchPlaceholder}
        />
      )}

      <div className="flex gap-0">
        {/* Filter Sidebar */}
        {features.showSidebarFilter && (
          <FilterSidebar
            isOpen={showFilter}
            onClose={() => setShowFilter(false)}
            filters={localFilters}
            onFiltersApply={(f) => { setLocalFilters(f); loadData(); }}
            columns={headerColumns}
          />
        )}

        {/* Main area */}
        <div className="flex-1 min-w-0">
          {/* Loading / Error / Empty */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-3 text-sm">Loading data…</p>
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 text-red-500">
              <p className="text-sm font-medium">{error}</p>
              <button className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-white" onClick={() => loadData()}>Retry</button>
            </div>
          )}
          {!loading && !error && dataState.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">{emptyMessage}</p>
            </div>
          )}

          {!loading && !error && dataState.length > 0 && (
            <VirtualTable
              data={dataState}
              columns={columns}
              sorting={sorting}
              onSortingChange={setSorting}
              columnVisibility={colVis}
              onColumnVisibilityChange={setColVis}
              rowSelection={rowSel}
              onRowSelectionChange={setRowSel}
              enableSelection={features.enableRowSelection}
              enableSorting={features.enableSorting ?? true}
              enableColumnPinning={features.enableColumnPinning}
              enableGrouping={features.enableRowGrouping}
              density={den}
              onRowClick={(row) => {
                if (drawerContent) { setDrawerData(row); setDrawerOpen(true); }
                onRowClick?.(row);
              }}
              onRowContextMenu={(row, pos) => { setCtxRow(row); setCtxMenu(pos); }}
              focusedCell={focusedCell}
              onFocusChange={setFocusedCell}
              editingCell={editingCell}
              onEditingCellChange={setEditingCell}
              rowClassName={rowClassName}
              emitEvent={(type, payload) => bus.emit(type as any, payload)}
            />
          )}
        </div>
      </div>

      {/* Pagination */}
      {(features.enablePagination !== false) && dataState.length > 0 && (
        <PaginationBar
          page={page}
          pageCount={Math.ceil(total / pageSizeState) || 1}
          total={total}
          pageSize={pageSizeState}
          pageSizeOptions={pageSizeOptions}
          selectedCount={selectedIds.length}
          onPageChange={(p) => { setPage(p); loadData(p); }}
          onPageSizeChange={(s) => { setPageSizeState(s); setPage(1); loadData(1); }}
          canPrevious={page > 1}
          canNext={page < Math.ceil(total / pageSizeState)}
        />
      )}

      {/* Context Menu */}
      {ctxMenu && ctxRow && contextMenuItems.length > 0 && (
        <ContextMenu
          items={contextMenuItems}
          row={ctxRow}
          position={ctxMenu}
          onClose={() => { setCtxMenu(null); setCtxRow(null); }}
          onAction={handleCtxAction}
        />
      )}

      {/* Detail Drawer */}
      {drawerContent && (
        <DetailDrawer
          isOpen={drawerOpen}
          onClose={() => { setDrawerOpen(false); setDrawerData(null); }}
          title={drawerTitle?.(drawerData) || 'Details'}
        >
          {drawerContent(drawerData)}
        </DetailDrawer>
      )}
    </div>
  );
}

// ─── Public Wrapper ──────────────────────────────────────────────

export function CustomDataGrid<TData extends { [key: string]: any; id?: string | number }>(props: CustomDataGridProps<TData>) {
  const storeRef = useRef<ReturnType<typeof createGridStore<TData>> | null>(null);
  if (!storeRef.current) storeRef.current = createGridStore<TData>();
  const store = storeRef.current;

  return (
    <GridProvider store={store as any}>
      <GridInner {...props} />
    </GridProvider>
  );
}

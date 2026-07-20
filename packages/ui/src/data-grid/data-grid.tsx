import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type OnChangeFn,
  type PaginationState,
  type HeaderGroup,
  type Row,
  type Cell,
  type Column,
} from '@tanstack/react-table';
import {
  useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect,
  type ReactNode, type KeyboardEvent,
} from 'react';
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Download, Search,
  SlidersHorizontal, Eye, EyeOff, FileSpreadsheet,
} from 'lucide-react';
import { PaginationBar } from './pagination-bar';

// ─── Types ──────────────────────────────────────────────────────────

/** Column format for display & export */
export interface ColumnFormat {
  /** Underlying value type */
  type: 'text' | 'number' | 'date' | 'datetime' | 'enum' | 'boolean' | 'currency' | 'percentage';
  /** Map raw value → display label (for 'enum' type) */
  enumValues?: Record<string, string>;
  /** Date format pattern (default: 'DD/MM/YYYY' or 'DD/MM/YYYY HH:mm') */
  dateFormat?: string;
  /** Intl number format style (for 'number'/'currency'/'percentage') */
  numberStyle?: 'decimal' | 'currency' | 'percent';
  /** Currency code (for 'currency' type, default 'USD') */
  currency?: string;
  /** Fixed decimal places (default: 2 for number/currency, 0 for percentage) */
  decimalPlaces?: number;
  /** Prefix string (e.g. '$') */
  prefix?: string;
  /** Suffix string (e.g. '%', ' kg') */
  suffix?: string;
  /** Locale for number/date formatting (default 'en-US') */
  locale?: string;
}

/** Excel export column properties (for xlsx generation) */
export interface ExcelColumnProperties {
  /** Excel number format string (e.g. '#,##0.00', 'DD/MM/YYYY', '@') */
  numberFormat?: string;
  /** Column width in characters */
  width?: number;
  /** Text alignment */
  alignment?: 'left' | 'center' | 'right';
  /** Wrap text */
  wrapText?: boolean;
  /** Font family (e.g. 'Calibri', 'Arial', 'Segoe UI', 'Times New Roman') */
  fontName?: string;
  /** Font size in points (e.g. 11) */
  fontSize?: number;
  /** Font ARGB color in hex (e.g. 'FF333333'). Omit = default (black). */
  fontColor?: string;
  /** Cell background fill ARGB color (e.g. 'FFFFF2CC' for pale yellow) */
  fillColor?: string;
  /** Bold text */
  bold?: boolean;
  /** Italic text */
  italic?: boolean;
  /** Header cell fill ARGB color (overrides fillColor for header) */
  headerFillColor?: string;
  /** Whether this column appears in the xlsx export. Default true. */
  exportable?: boolean;
}

export interface ColumnMeta {
  filterType?: 'text' | 'select' | 'number' | 'date' | 'boolean';
  filterOptions?: { label: string; value: string }[];
  align?: 'left' | 'center' | 'right';
  cellClass?: string;
  headerClass?: string;
  /** Display format for rendering & export */
  format?: ColumnFormat;
  /** Excel export properties (used by xlsx generator) */
  excel?: ExcelColumnProperties;
  /** Footer label (shown when showFooter enabled) */  footerText?: string;
  /** Map raw cell value -> CSS class for conditional styling */  cellValueClass?: Record<string, string>;
}

export type DataGridColumn<TData> = ColumnDef<TData, unknown> & { meta?: ColumnMeta };

export interface DataGridProps<TData> {
  columns: DataGridColumn<TData>[];
  data: TData[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  title?: string;
  searchPlaceholder?: string;
  page?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  enableSelection?: boolean;
  enableRowNumber?: boolean;
  enableSorting?: boolean;
  enableColumnVisibility?: boolean;
  enableColumnResize?: boolean;
  /** Show column-level filter inputs in header */  enableColumnFilter?: boolean;
  /** Show summary footer row */  showFooter?: boolean;
  enableExport?: boolean;
  enableDensity?: boolean;
  /** Show global search input */  enableSearch?: boolean;
  /** External density control — when provided, DataGrid defers to this value */
  density?: 'compact' | 'standard' | 'comfortable';
  onDensityChange?: (key: 'compact' | 'standard' | 'comfortable') => void;
  /** External column visibility control — when provided, DataGrid defers to this value */
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void;
  /** External column sticky state */
  columnStickyState?: Record<string, 'left' | 'right' | null>;
  onColumnStickyChange?: (sticky: Record<string, 'left' | 'right' | null>) => void;
  onRowClick?: (row: TData) => void;
  /** Right-click on a row — position is clientX/clientY for context menu placement */
  onRowContextMenu?: (row: TData, position: { x: number; y: number }) => void;
  /** Render action buttons for each row */  renderRowActions?: (row: TData) => ReactNode;
  /** Extra elements in the header toolbar (left side) */  toolbarNodes?: ReactNode;
  /** Table container max-height (default: 100%) */  maxHeight?: string;
  /** Enable row expansion with expand/collapse toggle column */  enableRowExpansion?: boolean;
  /** Render expanded detail content for a row */  renderRowDetail?: (row: TData) => ReactNode;
  /** Enable inline cell editing — click to edit, Enter/blur to save */  enableInlineEditing?: boolean;
  /** Called when a cell value is saved via inline editing */  onCellSave?: (row: TData, columnId: string, value: unknown) => void;
  onSelectionChange?: (rows: TData[]) => void;
  bulkActions?: ReactNode;
  actionButtons?: ReactNode;
  emptyMessage?: string;
  serverSide?: {
    manualPagination: true;
    pageCount: number;
    onPaginationChange: OnChangeFn<PaginationState>;
    pagination: PaginationState;
    manualSorting?: true;
    onSortingChange?: OnChangeFn<SortingState>;
    sorting?: SortingState;
    manualFiltering?: true;
    onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
    columnFilters?: ColumnFiltersState;
    onGlobalFilterChange?: OnChangeFn<string>;
    globalFilter?: string;
  };
  classNames?: { wrapper?: string; table?: string; header?: string; row?: string; cell?: string };
}

// ─── Density config ────────────────────────────────────────────────

interface DensityConfig {
  label: string;
  row: string;
  cell: string;
  font: string;
}

const DENSITY_MAP: Record<string, DensityConfig> = {
  compact:      { label: 'Compact',     row: 'py-0',   cell: 'px-1.5 py-0.5', font: 'text-xs' },
  standard:     { label: 'Standard',    row: 'py-0.5', cell: 'px-2 py-1',     font: 'text-xs' },
  comfortable:  { label: 'Comfortable', row: 'py-1.5', cell: 'px-3 py-2',     font: 'text-sm' },
};

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * Format a value according to ColumnFormat metadata.
 * Falls back to fmtVal() when no format is provided.
 */
export function getFormattedValue(value: unknown, format?: ColumnFormat): string {
  if (value === null || value === undefined) return '—';
  if (!format) {
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  const { type, enumValues, decimalPlaces, locale = 'en-US', prefix, suffix, currency, dateFormat } = format;

  switch (type) {
    case 'enum':
      return enumValues?.[String(value)] ?? String(value);

    case 'boolean':
      return value ? 'Yes' : 'No';

    case 'date':
    case 'datetime': {
      if (!value) return '—';
      const d = new Date(String(value));
      if (isNaN(d.getTime())) return String(value);
      try {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        if (type === 'datetime') {
          if (dateFormat?.includes('YYYY-MM-DD')) {
            return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
          }
          return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
        }
        if (dateFormat?.includes('YYYY-MM-DD')) return `${yyyy}-${mm}-${dd}`;
        return `${dd}/${mm}/${yyyy}`;
      } catch {
        return String(value);
      }
    }

    case 'number':
    case 'currency':
    case 'percentage': {
      const num = Number(value);
      if (isNaN(num)) return String(value);
      const dec = decimalPlaces ?? (type === 'percentage' ? 0 : 2);
      const formatted = num.toLocaleString(locale, {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
        style: type === 'currency' ? 'currency' : 'decimal',
        currency: type === 'currency' ? (currency ?? 'USD') : undefined,
      });
      const pfx = prefix ?? '';
      const sfx = suffix ?? (type === 'percentage' ? '%' : '');
      return `${pfx}${formatted}${sfx}`;
    }

    default:
      return String(value);
  }
}

export function exportCsv<T>(rows: T[], cols: DataGridColumn<T>[], name: string) {
  const visibleCols = cols.filter(c => {
    const ak = (c as any).accessorKey;
    if (!ak && !(c as any).id) return false;
    const xp = ((c as any).meta as ColumnMeta | undefined)?.excel;
    return xp?.exportable !== false;
  });
  const h = visibleCols
    .map(c => typeof (c as any).header === 'string' ? (c as any).header : (c as any).id || '');
  const d = rows.map(r =>
    visibleCols
      .map(c => {
        const meta = (c as any).meta as ColumnMeta | undefined;
        const fmt = meta?.format;
        const v = fmt
          ? getFormattedValue((r as any)[(c as any).accessorKey], fmt)
          : fmtVal((r as any)[(c as any).accessorKey]);
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      })
      .join(',')
  );
  const csv = [h.join(','), ...d].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.csv`; a.click();
}

/** Infer Excel number format from ColumnFormat.type */
function inferNumberFmt(fmt: ColumnFormat): string | undefined {
  switch (fmt.type) {
    case 'currency':       return `#,##0.00`;
    case 'percentage':     return `0%`;
    case 'number':         return `#,##0.${Array(fmt.decimalPlaces ?? 2).fill('0').join('')}`;
    case 'date':           return `DD/MM/YYYY`;
    case 'datetime':       return `DD/MM/YYYY HH:mm`;
    default:               return undefined;
  }
}

/**
 * Export rows to a real .xlsx file using exceljs.
 * Respects column.meta.format (value formatting) and
 * column.meta.excel (numberFormat, width, alignment, wrapText).
 */
export async function exportExcel<T>(rows: T[], cols: DataGridColumn<T>[], name: string) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.default.Workbook();
  workbook.creator = 'Portal';
  const ws = workbook.addWorksheet(name.slice(0, 31));

  const visibleCols = cols.filter(c => {
    const ak = (c as any).accessorKey;
    if (!ak) return false;
    const xp = ((c as any).meta as ColumnMeta | undefined)?.excel;
    return xp?.exportable !== false;
  });

  // ── Column definitions ──
  ws.columns = visibleCols.map((c) => {
    const meta = (c as any).meta as ColumnMeta | undefined;
    return {
      header: typeof (c as any).header === 'string' ? (c as any).header : (c as any).id || '',
      key: (c as any).accessorKey,
      width: meta?.excel?.width,
    };
  });

  // ── Style header row (per-column) ──
  const hdrRow = ws.getRow(1);
  hdrRow.alignment = { horizontal: 'center', vertical: 'middle' };
  visibleCols.forEach((c, colIdx) => {
    const colNum = colIdx + 1;
    const cell = hdrRow.getCell(colNum);
    const xp = ((c as any).meta as ColumnMeta | undefined)?.excel;
    cell.font = {
      bold: xp?.bold ?? true,
      name: xp?.fontName ?? 'Calibri',
      size: xp?.fontSize ?? 11,
      color: xp?.fontColor ? { argb: xp.fontColor } : undefined,
    };
    if (xp?.headerFillColor ?? xp?.fillColor) {
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: xp?.headerFillColor ?? xp?.fillColor ?? 'FFF5F5F5' },
      };
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    }
  });

  // ── Data rows ──
  for (const row of rows) {
    const rowData: Record<string, unknown> = {};
    for (const c of visibleCols) {
      const accessorKey = (c as any).accessorKey;
      const raw = (row as any)[accessorKey];
      const meta = (c as any).meta as ColumnMeta | undefined;
      const fmt = meta?.format;

      if (fmt?.type === 'number' || fmt?.type === 'currency' || fmt?.type === 'percentage') {
        const numeric = Number(raw);
        rowData[accessorKey] = isNaN(numeric) ? raw : numeric;
      } else if (fmt?.type === 'date' || fmt?.type === 'datetime') {
        const d = new Date(raw);
        rowData[accessorKey] = isNaN(d.getTime()) ? raw : d;
      } else if (fmt?.type === 'enum') {
        rowData[accessorKey] = fmt.enumValues?.[String(raw)] ?? raw;
      } else if (fmt?.type === 'boolean') {
        rowData[accessorKey] = raw ? 'Yes' : 'No';
      } else {
        rowData[accessorKey] = raw;
      }
    }
    ws.addRow(rowData);
  }

  // ── Column-level formatting (number format, alignment, font, fill) ──
  visibleCols.forEach((c, colIdx) => {
    const meta = (c as any).meta as ColumnMeta | undefined;
    const colNum = colIdx + 1;
    const xp = meta?.excel;
    const colFmt = meta?.format;

    const numFmt = xp?.numberFormat ?? (colFmt ? inferNumberFmt(colFmt) : undefined);

    const hasStyle = Boolean(numFmt || xp?.alignment || xp?.wrapText
      || xp?.fontName || xp?.fontSize || xp?.fontColor
      || xp?.fillColor || xp?.bold || xp?.italic);

    if (hasStyle) {
      for (let rowIdx = 2; rowIdx <= rows.length + 1; rowIdx++) {
        const cell = ws.getCell(rowIdx, colNum);
        if (numFmt) cell.numFmt = numFmt;
        // Font
        if (xp?.fontName || xp?.fontSize || xp?.fontColor || xp?.bold || xp?.italic) {
          cell.font = {
            ...(xp?.fontName ? { name: xp.fontName } : {}),
            ...(xp?.fontSize ? { size: xp.fontSize } : {}),
            ...(xp?.fontColor ? { color: { argb: xp.fontColor } } : {}),
            ...(xp?.bold !== undefined ? { bold: xp.bold } : {}),
            ...(xp?.italic !== undefined ? { italic: xp.italic } : {}),
          };
        }
        // Fill (background color)
        if (xp?.fillColor) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: xp.fillColor } };
        }
        // Alignment
        if (xp?.alignment || xp?.wrapText) {
          cell.alignment = {
            ...(xp?.alignment ? { horizontal: xp.alignment as any } : {}),
            ...(xp?.wrapText ? { wrapText: true } : {}),
            vertical: 'middle',
          };
        }
      }
    }
  });

  // ── Generate buffer & download ──
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.xlsx`;
  a.click();
}

// ─── Main ──────────────────────────────────────────────────────────

export function DataGrid<TData extends { [key: string]: any } = Record<string, unknown>>({
  columns: cols, data, isLoading = false, error = null, onRetry,
  title, page: extPage, pageSize: extPageSize = 20,
  pageSizeOptions: pso = [10, 20, 50, 100],
  total: extTotal,
  onPageChange: extOnPageChange, onPageSizeChange: extOnPageSizeChange,
  enableSelection, enableRowNumber, enableSorting = true, enableColumnVisibility = true,
  enableColumnResize, enableExport = true, enableDensity = true, enableSearch = false, enableColumnFilter = false, showFooter = false,
  searchPlaceholder,
  density: extDenKey, onDensityChange: extOnDenChange,
  columnVisibility: extColVis, onColumnVisibilityChange: extOnColVisChange,
  columnStickyState: extColSticky, onColumnStickyChange: extOnColStickyChange,
  onRowClick, onRowContextMenu, onSelectionChange, bulkActions, actionButtons, renderRowActions, toolbarNodes, maxHeight = '100%',
  enableRowExpansion, renderRowDetail,
  enableInlineEditing, onCellSave,
  emptyMessage = 'No data found.', serverSide, classNames = {},
}: DataGridProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [colFilters, setColFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const startEditing = useCallback((rowId: string, columnId: string, currentValue: string) => {
    setEditingCell({ rowId, columnId });
    setEditValue(currentValue);
  }, []);
  const commitEdit = useCallback((row: TData, columnId: string) => {
    if (!editingCell) return;
    onCellSave?.(row, columnId, editValue);
    setEditingCell(null);
  }, [editingCell, editValue, onCellSave]);
  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);
  const toggleRowExpanded = useCallback((rowId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);
  const [colVisInternal, setColVisInternal] = useState<VisibilityState>({});
  const colVis = extColVis ?? colVisInternal;
  const setColVis = (extOnColVisChange ?? setColVisInternal) as (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void;
  const [rowSel, setRowSel] = useState<RowSelectionState>({});
  const [denKeyInternal, setDenKeyInternal] = useState('standard');
  const denKey: string = extDenKey ?? denKeyInternal;
  const setDenKey = extOnDenChange ?? setDenKeyInternal;
  const [showDenMenu, setShowDenMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [contextRowId, setContextRowId] = useState<string | null>(null);
  const [columnStickyInternal, setColumnStickyInternal] = useState<Record<string, 'left' | 'right' | null>>({});
  const columnSticky = extColSticky ?? columnStickyInternal;
  const setColumnSticky = extOnColStickyChange ?? setColumnStickyInternal;

  const den = (DENSITY_MAP[denKey] ?? DENSITY_MAP.standard) as DensityConfig;

  // ─── Dynamic Sticky Offsets ───────────────────────────────────────────
  const systemWidthsRef = useRef({ hash: 48, selection: 40 });
  const [, forceUpdate] = useState(0);

  // Measure actual rendered widths of #/selection columns on every render
  useLayoutEffect(() => {
    const hashEl = document.querySelector<HTMLElement>('[data-sticky-id="row-number"]');
    const selEl = document.querySelector<HTMLElement>('[data-sticky-id="selection"]');
    if (hashEl || selEl) {
      const hashW = hashEl?.offsetWidth ?? 48;
      const selW = selEl?.offsetWidth ?? 40;
      if (hashW !== systemWidthsRef.current.hash || selW !== systemWidthsRef.current.selection) {
        systemWidthsRef.current = { hash: hashW, selection: selW };
        forceUpdate(n => n + 1);
      }
    }
  });

  const hw = systemWidthsRef.current.hash;
  const sw = systemWidthsRef.current.selection;
  const selLeft = enableRowNumber ? hw : 0;
  const stickyLeftBase = (enableRowNumber ? hw : 0) + (enableSelection ? sw : 0);

  function getColStickyAttr(colId: string): { className: string; style: React.CSSProperties } | null {
    const pos = columnSticky[colId];
    if (!pos) return null;
    if (pos === 'left') return {
      className: 'sticky',
      style: { left: stickyLeftBase, zIndex: 10 },
    };
    return { className: 'sticky', style: { right: 0, zIndex: 10 } };
  }

  const table = useReactTable({
    data, columns: cols as ColumnDef<TData, unknown>[],
    state: { sorting: serverSide?.sorting ?? sorting, columnFilters: serverSide?.columnFilters ?? colFilters, globalFilter: serverSide?.globalFilter ?? globalFilter, columnVisibility: colVis, rowSelection: rowSel },
    onSortingChange: serverSide?.onSortingChange ?? setSorting,
    onColumnFiltersChange: serverSide?.onColumnFiltersChange ?? setColFilters,
    onGlobalFilterChange: serverSide?.onGlobalFilterChange ?? setGlobalFilter,
    onColumnVisibilityChange: setColVis, onRowSelectionChange: setRowSel,
    enableRowSelection: enableSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: !serverSide?.manualFiltering ? getFilteredRowModel() : undefined,
    debugTable: false,
  });

  // Notify parent of selection changes (avoid table ref in deps — it's derived each render)
  const prevRowSelRef = useRef(rowSel);
  const prevSelNotifiedRef = useRef(false);
  useEffect(() => {
    if (!onSelectionChange) return;
    const currentSel = table.getSelectedRowModel().flatRows.map(r => r.original);
    // Only fire when selection actually changed
    if (prevRowSelRef.current !== rowSel) {
      prevRowSelRef.current = rowSel;
      prevSelNotifiedRef.current = true;
      onSelectionChange(currentSel);
    }
  }, [rowSel, onSelectionChange]);

  // Clear context-row highlight when clicking outside rows
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect((): (() => void) | undefined => {
    if (!contextRowId) return undefined;
    const handler = (e: MouseEvent) => setContextRowId((e.target as HTMLElement).closest('tr') ? contextRowId : null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextRowId]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      const sel = table.getSelectedRowModel().flatRows;
      if (sel.length) {
        const txt = sel.map(r => cols.map(c => { const ak = (c as any).accessorKey; return ak ? fmtVal(r.original[ak as keyof TData]) : ''; }).join('\t')).join('\n');
        navigator.clipboard.writeText(txt);
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); document.querySelector<HTMLInputElement>('[data-dg-search]')?.focus(); }
  }, [table, cols]);

  const selRows = table.getSelectedRowModel().flatRows.map(r => r.original);
  const hasSel = selRows.length > 0;
  const isManualFiltering = serverSide?.manualFiltering === true;
  const hasExternalPagination = extTotal !== undefined;
  const pageIndex = extPage ?? 0;
  const pSize = extPageSize ?? serverSide?.pagination?.pageSize ?? 20;
  const total = extTotal ?? (isManualFiltering
    ? (serverSide?.pageCount ?? 1) * pSize
    : table.getFilteredRowModel().rows.length);
  const pageCount = Math.max(1, Math.ceil(total / pSize));

  // Pagination event handlers — prefer external callbacks, fall back to serverSide
  const handlePageChange: (p: number) => void = extOnPageChange ?? ((p) => {
    serverSide?.onPaginationChange?.({ pageIndex: p, pageSize: pSize });
  });
  const handlePageSizeChange: (s: number) => void = extOnPageSizeChange ?? ((s) => {
    serverSide?.onPaginationChange?.({ pageIndex: 0, pageSize: s });
  });

  function renderHead(hg: HeaderGroup<TData>) {
    return (
      <tr key={hg.id} className="border-b" style={{ backgroundColor: 'var(--color-muted)' }}>
        {enableRowNumber && <th data-sticky-id="row-number" className={`${den.cell} ${den.font} sticky text-center text-muted-foreground border-r border-b border-border`} style={{ left: 0, zIndex: 20, backgroundColor: 'var(--color-muted)', minWidth: 48, width: 48 }}>#</th>}
        {enableSelection && <th data-sticky-id="selection" className={`${den.cell} ${den.font} sticky text-center border-r border-b border-border`} style={{ left: selLeft, zIndex: 20, backgroundColor: 'var(--color-muted)', minWidth: 40, width: 40 }}><input type="checkbox" className="h-4 w-4" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} /></th>}
        {enableRowExpansion && <th className={`${den.cell} ${den.font} text-center border-r border-b border-border text-muted-foreground`} style={{ width: 36, minWidth: 36, backgroundColor: 'var(--color-muted)' }}></th>}
        {hg.headers.map(h => {
          const m = h.column.columnDef.meta as ColumnMeta | undefined;
          const cs = enableSorting && h.column.getCanSort();
          const stickyAttr = getColStickyAttr(h.column.id);
          const filterValue = (h.column.getFilterValue() ?? '') as string;
          return (
            <th key={h.id} className={`${den.cell} ${den.font} font-semibold text-muted-foreground whitespace-nowrap border-r border-b border-border ${m?.align === 'right' ? 'text-right' : m?.align === 'center' ? 'text-center' : 'text-left'} ${cs ? 'cursor-pointer select-none hover:bg-accent/50' : ''} ${classNames.header ?? ''} ${enableColumnResize ? 'relative' : ''} ${stickyAttr?.className ?? ''}`}
              onClick={cs ? h.column.getToggleSortingHandler() : undefined} style={{ ...(stickyAttr?.style ?? {}), width: h.getSize(), ...(stickyAttr ? { backgroundColor: 'var(--color-muted)' } : {}) }} colSpan={h.colSpan}>
              <div className="flex items-center gap-1">
                {flexRender(h.column.columnDef.header, h.getContext())}
                {cs && <span className="shrink-0 text-muted-foreground/50">{h.column.getIsSorted() === 'asc' ? <ChevronUp size={14} /> : h.column.getIsSorted() === 'desc' ? <ChevronDown size={14} /> : <ChevronsUpDown size={14} />}</span>}
              </div>
              {enableColumnFilter && m?.filterType && (
                <div className="mt-1">
                  {m.filterType === 'select' && m.filterOptions ? (
                    <select className="w-full rounded border bg-background px-1 py-0.5 text-[10px] outline-none focus:border-primary" value={filterValue} onChange={e => { const v = e.target.value; h.column.setFilterValue(v || undefined); }}>
                      <option value="">All</option>
                      {m.filterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input type={m.filterType === 'number' ? 'number' : m.filterType === 'date' ? 'date' : 'text'} className="w-full rounded border bg-background px-1 py-0.5 text-[10px] outline-none focus:border-primary" placeholder={`Filter ${h.column.id}…`} value={filterValue} onChange={e => { const v = e.target.value; h.column.setFilterValue(v || undefined); }} />
                  )}
                </div>
              )}
              {enableColumnResize && <div onMouseDown={h.getResizeHandler()} onTouchStart={h.getResizeHandler()} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-border hover:bg-primary" />}
            </th>
          );
        })}
      </tr>
    );
  }

  function renderRow(row: Row<TData>, rowIdx: number) {
    const isEven = rowIdx % 2 === 0;
    const isCtxRow = contextRowId === row.id;
    const rowBg = row.getIsSelected()
      ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)'
      : isCtxRow
        ? 'color-mix(in srgb, var(--color-accent) 80%, transparent)'
        : isEven ? 'var(--color-card)' : 'var(--color-muted)';
    return (
      <>
      <tr key={row.id}
        className={`border-b transition-colors ${den.row} ${onRowClick ? 'cursor-pointer' : ''} ${classNames.row ?? ''}`}
        style={{ backgroundColor: rowBg }}
        onClick={() => onRowClick?.(row.original)}
        onContextMenu={(e) => { e.preventDefault(); setContextRowId(row.id); onRowContextMenu?.(row.original, { x: e.clientX, y: e.clientY }); }}>
        {enableRowNumber && <td data-sticky-id="row-number" className={`${den.cell} sticky text-center text-muted-foreground ${den.font} border-r border-b border-border`} style={{ left: 0, zIndex: 10, minWidth: 48, width: 48, backgroundColor: rowBg }}>{rowIdx + 1 + pageIndex * pSize}</td>}
        {enableSelection && <td data-sticky-id="selection" className={`${den.cell} sticky text-center border-r border-b border-border`} style={{ left: selLeft, zIndex: 10, minWidth: 40, width: 40, backgroundColor: rowBg }}><input type="checkbox" className="h-4 w-4" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={e => e.stopPropagation()} /></td>}
        {enableRowExpansion && (
          <td className={`${den.cell} ${den.font} text-center border-r border-b border-border cursor-pointer`} style={{ width: 36, minWidth: 36, backgroundColor: rowBg }} onClick={() => toggleRowExpanded(row.id)}>
            <ChevronRight size={14} className="inline-block transition-transform" style={{ transform: expandedRows.has(row.id) ? 'rotate(90deg)' : 'rotate(0deg)' }} />
          </td>
        )}
        {row.getVisibleCells().map((cell: Cell<TData, unknown>) => {
          const m = cell.column.columnDef.meta as ColumnMeta | undefined;
          const stickyAttr = getColStickyAttr(cell.column.id);
          const cellRaw = (cell.column.columnDef as any).accessorKey ? (row.original as any)[(cell.column.columnDef as any).accessorKey] : undefined;
          const valClass = (cellRaw !== undefined && m?.cellValueClass) ? (m.cellValueClass[String(cellRaw)] ?? '') : '';
          const isEditing = enableInlineEditing && editingCell?.rowId === row.id && editingCell?.columnId === cell.column.id;
          const cellValue = (cell.column.columnDef as any).accessorKey ? (row.original as any)[(cell.column.columnDef as any).accessorKey] : undefined;
          return (
            <td key={cell.id} className={`${den.cell} ${den.font} border-r border-b border-border ${m?.align === 'right' ? 'text-right' : m?.align === 'center' ? 'text-center' : 'text-left'} ${m?.cellClass ?? ''} ${valClass} ${classNames.cell ?? ''} ${stickyAttr?.className ?? ''} ${enableInlineEditing && !isEditing ? 'cursor-pointer hover:bg-accent/30' : ''}`} style={{ ...(stickyAttr?.style ?? {}), backgroundColor: rowBg }}
              onDoubleClick={() => { if (enableInlineEditing) { startEditing(row.id, cell.column.id, String(cellValue ?? '')); setTimeout(() => editInputRef.current?.focus(), 0); } }}>
              {isEditing ? (
                <input ref={editInputRef} type={m?.filterType === 'number' ? 'number' : 'text'}
                  className="h-6 w-full rounded border bg-background px-1 text-xs outline-none focus:border-primary"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(row.original, cell.column.id)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitEdit(row.original, cell.column.id); } else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); } }} />
              ) : (
                <span className="truncate block">{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
              )}
            </td>
          );
        })}
        {renderRowActions && (
          <td className={`${den.cell} ${den.font} border-r border-b border-border text-right whitespace-nowrap`} style={{ backgroundColor: rowBg }}>
            {renderRowActions(row.original)}
          </td>
        )}
      </tr>
      {enableRowExpansion && renderRowDetail && expandedRows.has(row.id) && (
        <tr className="border-b" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 3%, transparent)' }}>
          <td colSpan={
            (enableRowNumber ? 1 : 0) +
            (enableSelection ? 1 : 0) +
            (enableRowExpansion ? 1 : 0) +
            table.getVisibleFlatColumns().length +
            (renderRowActions ? 1 : 0)
          } className="px-4 py-2 text-xs">
            {renderRowDetail(row.original)}
          </td>
        </tr>
      )}
      </>);
  }

  return (
    <div className={`flex flex-1 flex-col min-h-0 space-y-2 ${classNames.wrapper ?? ''}`} onKeyDown={handleKey}>
      {/* ── Panel Header ── */}
      {Boolean(title || enableExport || enableDensity || actionButtons || enableSearch) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-1.5 min-h-0">
          <div className="flex items-center gap-2">
            {title && <h2 className="text-sm font-bold tracking-tight">{title}</h2>}
            {hasSel && <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{selRows.length} selected</span>}
            {hasSel && bulkActions}
            {actionButtons}
            {toolbarNodes}
          </div>
          <div className="flex items-center gap-1.5">
            {enableSearch && (
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2 text-muted-foreground pointer-events-none" />
                <input
                  data-dg-search
                  type="text"
                  placeholder={searchPlaceholder || 'Search\u2026'}
                  className="h-7 w-44 rounded-md border bg-background pl-7 pr-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={serverSide?.globalFilter ?? globalFilter}
                  onChange={(e) => {
                    const v = e.target.value;
                    serverSide?.onGlobalFilterChange?.(v);
                    setGlobalFilter(v);
                  }}
                />
              </div>
            )}
            {enableExport && (
              <div className="relative">
                <button className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-accent"
                  onClick={() => setShowExportMenu(!showExportMenu)}><Download size={14} /> Export <ChevronDown size={12} />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border bg-card shadow-xl"
                    onMouseLeave={() => setShowExportMenu(false)}>
                    <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                      onClick={() => {
                        exportCsv(table.getFilteredRowModel().rows.map(r => r.original), cols, title ?? 'export');
                        setShowExportMenu(false);
                      }}>
                      <Download size={14} /> Export CSV
                    </button>
                    <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                      onClick={async () => {
                        await exportExcel(table.getFilteredRowModel().rows.map(r => r.original), cols, title ?? 'export');
                        setShowExportMenu(false);
                      }}>
                      <FileSpreadsheet size={14} /> Export XLSX
                    </button>
                  </div>
                )}
              </div>
            )}
            {enableDensity && (
              <div className="relative">
                <button className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-accent"
                  onClick={() => setShowDenMenu(!showDenMenu)}><SlidersHorizontal size={14} /> {DENSITY_MAP[denKey]?.label ?? 'Density'}</button>
                {showDenMenu && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border bg-card shadow-xl" onMouseLeave={() => setShowDenMenu(false)}>
                    {Object.entries(DENSITY_MAP).map(([k, d]) => (
                      <button key={k} className={`flex w-full items-center px-3 py-1.5 text-sm hover:bg-accent ${denKey === k ? 'font-semibold text-primary' : ''}`}
                        onClick={() => { setDenKey(k as 'compact' | 'standard' | 'comfortable'); setShowDenMenu(false); }}>{d.label}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Table Area ── */}
      <div className="flex-1 min-h-0 isolate rounded-lg border bg-card" style={{ overflow: 'auto', maxHeight }}>
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-2 text-xs">Loading…</p>
          </div>
        )}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-8 text-red-500">
            <p className="text-xs font-medium">{error}</p>
            {onRetry && <button className="mt-2 rounded-md bg-primary px-3 py-1 text-xs text-white hover:bg-primary/90" onClick={onRetry}>Retry</button>}
          </div>
        )}
        {!isLoading && !error && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-xs">{emptyMessage}</p>
          </div>
        )}
        {!isLoading && !error && data.length > 0 && (
          <table className="w-full border border-border border-collapse" style={{ minWidth: Math.max(600, table.getTotalSize()), tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-30">{table.getHeaderGroups().map(renderHead)}</thead>
            <tbody>{table.getRowModel().rows.map((row, idx) => renderRow(row, idx))}</tbody>
            {showFooter && (() => {
              const visibleCols = table.getVisibleFlatColumns();
              const rows = table.getRowModel().rows;
              return (
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold" style={{ backgroundColor: 'var(--color-muted)' }}>
                    {enableRowNumber && <td className="sticky text-center text-xs text-muted-foreground px-1.5 py-1 border-r" style={{ left: 0, backgroundColor: 'var(--color-muted)' }}></td>}
                    {enableSelection && <td className="sticky text-center border-r" style={{ left: 40, backgroundColor: 'var(--color-muted)' }}></td>}
                    {visibleCols.map(col => {
                      const m = col.columnDef.meta as any;
                      const footerText = m?.footerText;
                      const format = m?.format;
                      // Auto-sum number/currency columns
                      let autoSum: string | null = null;
                      if (format && (format.type === 'number' || format.type === 'currency' || format.type === 'percentage') && rows.length > 0) {
                        const ak = (col.columnDef as any).accessorKey as string;
                        if (ak) {
                          const sum = rows.reduce((acc, r) => {
                            const v = parseFloat((r.original as any)[ak]);
                            return acc + (isNaN(v) ? 0 : v);
                          }, 0);
                          if (format.type === 'currency') autoSum = sum.toLocaleString('en-US', { style: 'currency', currency: format.currency || 'USD', minimumFractionDigits: 2 });
                          else if (format.type === 'percentage') autoSum = sum.toFixed(0) + '%';
                          else autoSum = sum.toLocaleString('en-US', { minimumFractionDigits: format.decimalPlaces ?? 2 });
                        }
                      }
                      const display = autoSum ?? footerText ?? '';
                      return <td key={col.id} className="px-2 py-1 text-xs border-r">{display}</td>;
                    })}
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {!isLoading && !error && data.length > 0 && (
        <PaginationBar
          pageIndex={pageIndex}
          pageSize={pSize}
          total={total}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={pso}
          className="relative z-30"
        />
      )}
    </div>
  );
}

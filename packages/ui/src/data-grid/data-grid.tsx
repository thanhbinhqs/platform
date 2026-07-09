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
} from '@tanstack/react-table';
import {
  useState, useMemo, useCallback, useRef, useEffect,
  type ReactNode, type KeyboardEvent,
} from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, Download, Columns,
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
  enableExport?: boolean;
  enableDensity?: boolean;
  /** External density control — when provided, DataGrid defers to this value */
  density?: 'compact' | 'standard' | 'comfortable';
  onDensityChange?: (key: 'compact' | 'standard' | 'comfortable') => void;
  /** External column visibility control — when provided, DataGrid defers to this value */
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void;
  onRowClick?: (row: TData) => void;
  /** Right-click on a row — position is clientX/clientY for context menu placement */
  onRowContextMenu?: (row: TData, position: { x: number; y: number }) => void;
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
  enableColumnResize, enableExport = true, enableDensity = true,
  density: extDenKey, onDensityChange: extOnDenChange,
  columnVisibility: extColVis, onColumnVisibilityChange: extOnColVisChange,
  onRowClick, onRowContextMenu, onSelectionChange, bulkActions, actionButtons,
  emptyMessage = 'No data found.', serverSide, classNames = {},
}: DataGridProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [colFilters, setColFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [colVisInternal, setColVisInternal] = useState<VisibilityState>({});
  const colVis = extColVis ?? colVisInternal;
  const setColVis = (extOnColVisChange ?? setColVisInternal) as (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void;
  const [rowSel, setRowSel] = useState<RowSelectionState>({});
  const [denKeyInternal, setDenKeyInternal] = useState('standard');
  const denKey: string = extDenKey ?? denKeyInternal;
  const setDenKey = extOnDenChange ?? setDenKeyInternal;
  const [showColMenu, setShowColMenu] = useState(false);
  const [showDenMenu, setShowDenMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [contextRowId, setContextRowId] = useState<string | null>(null);
  const [columnSticky, setColumnSticky] = useState<Record<string, 'left' | 'right' | null>>({});

  const den = (DENSITY_MAP[denKey] ?? DENSITY_MAP.standard) as DensityConfig;

  // Compute fixed-left offset (rowNumber + selection always sticky-left)
  const stickyLeftBase = (enableRowNumber ? 48 : 0) + (enableSelection ? 40 : 0);

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
      <tr key={hg.id} className="border-b bg-muted/50">
        {enableRowNumber && <th className={`${den.cell} ${den.font} sticky bg-muted/50 w-12 text-center text-muted-foreground`} style={{ left: 0, zIndex: 20 }}>#</th>}
        {enableSelection && <th className={`${den.cell} ${den.font} sticky bg-muted/50 w-10 text-center`} style={{ left: enableRowNumber ? 48 : 0, zIndex: 20 }}><input type="checkbox" className="h-4 w-4" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} /></th>}
        {hg.headers.map(h => {
          const m = h.column.columnDef.meta as ColumnMeta | undefined;
          const cs = enableSorting && h.column.getCanSort();
          const stickyAttr = getColStickyAttr(h.column.id);
          return (
            <th key={h.id} className={`${den.cell} ${den.font} font-semibold text-muted-foreground whitespace-nowrap ${m?.align === 'right' ? 'text-right' : m?.align === 'center' ? 'text-center' : 'text-left'} ${cs ? 'cursor-pointer select-none hover:bg-accent/50' : ''} ${classNames.header ?? ''} ${enableColumnResize ? 'relative' : ''} ${stickyAttr?.className ?? ''} ${stickyAttr ? 'bg-muted/50' : ''}`}
              onClick={cs ? h.column.getToggleSortingHandler() : undefined} style={{ ...(stickyAttr?.style ?? {}), width: h.getSize() }} colSpan={h.colSpan}>
              <div className="flex items-center gap-1">
                {flexRender(h.column.columnDef.header, h.getContext())}
                {cs && <span className="shrink-0 text-muted-foreground/50">{h.column.getIsSorted() === 'asc' ? <ChevronUp size={14} /> : h.column.getIsSorted() === 'desc' ? <ChevronDown size={14} /> : <ChevronsUpDown size={14} />}</span>}
              </div>
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
    const stripeClass = isEven ? 'bg-card' : 'bg-muted/10';
    return (
      <tr key={row.id}
        className={`border-b transition-colors ${row.getIsSelected() ? 'bg-primary/5' : isCtxRow ? 'bg-accent/60' : stripeClass + ' hover:bg-accent/30'} ${den.row} ${onRowClick ? 'cursor-pointer' : ''} ${classNames.row ?? ''}`}
        onClick={() => onRowClick?.(row.original)}
        onContextMenu={(e) => { e.preventDefault(); setContextRowId(row.id); onRowContextMenu?.(row.original, { x: e.clientX, y: e.clientY }); }}>
        {enableRowNumber && <td className={`${den.cell} sticky w-12 text-center text-muted-foreground ${row.getIsSelected() ? 'bg-primary/5' : isCtxRow ? 'bg-accent/60' : stripeClass} ${den.font}`} style={{ left: 0, zIndex: 10 }}>{rowIdx + 1 + pageIndex * pSize}</td>}
        {enableSelection && <td className={`${den.cell} sticky w-10 text-center ${row.getIsSelected() ? 'bg-primary/5' : isCtxRow ? 'bg-accent/60' : stripeClass}`} style={{ left: enableRowNumber ? 48 : 0, zIndex: 10 }}><input type="checkbox" className="h-4 w-4" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={e => e.stopPropagation()} /></td>}
        {row.getVisibleCells().map((cell: Cell<TData, unknown>) => {
          const m = cell.column.columnDef.meta as ColumnMeta | undefined;
          const stickyAttr = getColStickyAttr(cell.column.id);
          return <td key={cell.id} className={`${den.cell} ${den.font} ${m?.align === 'right' ? 'text-right' : m?.align === 'center' ? 'text-center' : 'text-left'} ${m?.cellClass ?? ''} ${classNames.cell ?? ''} ${stickyAttr?.className ?? ''} ${stickyAttr ? (row.getIsSelected() ? 'bg-primary/5' : isCtxRow ? 'bg-accent/60' : stripeClass) : ''}`} style={stickyAttr?.style ?? {}}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>;
        })}
      </tr>
    );
  }

  return (
    <div className={`flex flex-1 flex-col min-h-0 space-y-2 ${classNames.wrapper ?? ''}`} onKeyDown={handleKey}>
      {/* ── Panel Header ── */}
      {Boolean(title || enableExport || enableColumnVisibility || enableDensity || actionButtons) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-1.5 min-h-0">
          <div className="flex items-center gap-2">
            {title && <h2 className="text-sm font-bold tracking-tight">{title}</h2>}
            {hasSel && <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{selRows.length} selected</span>}
            {hasSel && bulkActions}
            {actionButtons}
          </div>
          <div className="flex items-center gap-1.5">
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
            {enableColumnVisibility && (
              <div className="relative">
                <button className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium hover:bg-accent"
                  onClick={() => setShowColMenu(!showColMenu)}><Columns size={14} /> Columns</button>
                {showColMenu && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border bg-card shadow-xl">
                    <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">Column Settings</div>
                    {cols.map((c, i) => {
                      const id = (c as any).accessorKey || (c as any).id || String(i);
                      const hdr = typeof (c as any).header === 'string' ? (c as any).header : id;
                      if (id.startsWith('__')) return null;
                      const vis = colVis[id] !== false;
                      const stickyPos = columnSticky[id] ?? null;
                      return (
                        <div key={id} className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-accent/30">
                          <button className="shrink-0 rounded p-1 hover:bg-accent" title={vis ? 'Hide' : 'Show'}
                            onClick={() => setColVis({ ...colVis, [id]: !vis })}>
                            {vis ? <Eye size={14} /> : <EyeOff size={14} className="text-muted-foreground" />}
                          </button>
                          <span className={`flex-1 truncate text-xs ${vis ? '' : 'text-muted-foreground line-through'}`}>{hdr}</span>
                          {vis && (
                            <div className="flex items-center gap-0.5">
                              <button className={`rounded p-0.5 ${stickyPos === 'left' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
                                title="Pin left" onClick={() => setColumnSticky({ ...columnSticky, [id]: stickyPos === 'left' ? null : 'left' })}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h6m0 0 3-3m-3 3 3 3"/><path d="M21 5v14"/></svg>
                              </button>
                              <button className={`rounded p-0.5 ${stickyPos === 'right' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
                                title="Pin right" onClick={() => setColumnSticky({ ...columnSticky, [id]: stickyPos === 'right' ? null : 'right' })}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12h-6m0 0 3-3m-3 3 3 3"/><path d="M3 5v14"/></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
      <div className="flex-1 min-h-0 isolate rounded-lg border bg-card" style={{ overflow: 'auto', maxHeight: '100%' }}>
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
          <table className="w-full border-collapse" style={{ minWidth: Math.max(600, table.getTotalSize()) }}>
            <thead className="sticky top-0 z-30">{table.getHeaderGroups().map(renderHead)}</thead>
            <tbody>{table.getRowModel().rows.map((row, idx) => renderRow(row, idx))}</tbody>
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

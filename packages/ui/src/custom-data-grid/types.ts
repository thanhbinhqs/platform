// ═══════════════════════════════════════════════════════════════
// CustomDataGrid — Core Types
// ═══════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';
import type { RowData } from '@tanstack/react-table';

// ─── ColumnMeta Module Augmentation ──────────────────────────────
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    filterType?: 'text' | 'select' | 'date-range' | 'number-range' | 'boolean';
    filterOptions?: { label: string; value: unknown }[];
    isPinnedDefault?: 'left' | 'right';
    align?: 'left' | 'center' | 'right';
    cellFormatter?: (value: TValue) => ReactNode;
  }
}

// ─── Feature Flags ──────────────────────────────────────────────
export interface GridFeatures {
  enablePagination?: boolean;
  enableRowSelection?: boolean;
  enableColumnPinning?: boolean;
  enableSorting?: boolean;
  enableFilter?: boolean;
  showSidebarFilter?: boolean;
  showPanelHeader?: boolean;
  enableContextMenu?: boolean;
  enableVirtualization?: boolean;
  enableInlineEditing?: boolean;
  enableRowGrouping?: boolean;
  enableExport?: boolean;
  enableScanner?: boolean;
  enableRealtime?: boolean;
  enableKeyboardNav?: boolean;
}

// ─── Grid Request / Response ────────────────────────────────────
export interface SortModel {
  field: string;
  dir: 'asc' | 'desc';
}

export interface FilterModel {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'between' | 'in';
  value: unknown;
}

export interface GridRequest {
  page: number;
  pageSize: number;
  sorts?: SortModel[];
  filters?: FilterModel[];
  globalSearch?: string;
  include?: string[];
}

export interface GridResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Events ─────────────────────────────────────────────────────
export enum GridEventType {
  RowSelected = 'RowSelected',
  RowDeselected = 'RowDeselected',
  CellEdited = 'CellEdited',
  RowDeleted = 'RowDeleted',
  FilterChanged = 'FilterChanged',
  SortChanged = 'SortChanged',
  ExportStarted = 'ExportStarted',
  ExportCompleted = 'ExportCompleted',
  ScannerDetected = 'ScannerDetected',
  RealtimeUpdated = 'RealtimeUpdated',
  PageChanged = 'PageChanged',
  ContextMenuOpened = 'ContextMenuOpened',
  RowPinned = 'RowPinned',
}

export interface GridEvent {
  type: GridEventType;
  payload: unknown;
  timestamp: number;
}

// ─── Permission ─────────────────────────────────────────────────
export interface PermissionCheck {
  action: string;
  resource: string;
  data?: Record<string, unknown>;
}

export interface PermissionEngine {
  can(action: string, resource: string, data?: Record<string, unknown>): boolean;
  canRow(row: Record<string, unknown>, action: string): boolean;
  canCell(row: Record<string, unknown>, column: string, action: string): boolean;
}

// ─── Theme ──────────────────────────────────────────────────────
export interface GridThemeTokens {
  spacing: 'compact' | 'standard' | 'comfortable';
  radius: 'none' | 'sm' | 'md' | 'lg';
  colors: {
    primary: string;
    primaryForeground: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    accent: string;
    accentForeground: string;
    danger: string;
    success: string;
    warning: string;
  };
  font: {
    size: string;
    family: string;
    weight: string;
  };
  border: string;
}

// ─── Context Menu ───────────────────────────────────────────────
export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  action: string;
  disabled?: boolean | ((row: Record<string, unknown>) => boolean);
  divider?: boolean;
  children?: ContextMenuItem[];
}

// ─── Row Styling ────────────────────────────────────────────────
export interface RowStyle {
  className?: string;
  style?: React.CSSProperties;
}

// ─── Data Source ────────────────────────────────────────────────
export interface IDataSource<TData> {
  name: string;
  load(request: GridRequest): Promise<GridResponse<TData>>;
  create?(data: Partial<TData>): Promise<TData>;
  update?(id: string | number, data: Partial<TData>): Promise<TData>;
  delete?(id: string | number): Promise<boolean>;
  bulkDelete?(ids: (string | number)[]): Promise<boolean>;
}

// ─── Plugin ─────────────────────────────────────────────────────
export interface GridPlugin<TData = Record<string, unknown>> {
  name: string;
  version?: string;
  onInit?(context: GridPluginContext<TData>): void;
  onDestroy?(): void;
  hooks?: Partial<GridPluginHooks<TData>>;
}

export interface GridPluginContext<TData> {
  getState: () => GridState<TData>;
  dispatch: (event: GridEvent) => void;
  getDataSource: () => IDataSource<TData> | null;
}

export interface GridPluginHooks<TData> {
  beforeLoad: (request: GridRequest) => GridRequest;
  afterLoad: (response: GridResponse<TData>) => GridResponse<TData>;
  beforeRender: (rows: TData[]) => TData[];
  onEvent: (event: GridEvent) => void;
  rowClassName: (row: TData) => string | undefined;
}

// ─── Grid State ─────────────────────────────────────────────────
export interface GridState<TData> {
  data: TData[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  totalPages: number;
  sorts: SortModel[];
  filters: FilterModel[];
  globalSearch: string;
  selectedRows: Record<string, boolean>;
  columnVisibility: Record<string, boolean>;
  columnPinning: Record<string, 'left' | 'right' | false>;
  density: 'compact' | 'standard' | 'comfortable';
}

// ═══════════════════════════════════════════════════════════════
// @platform/ui — Barrel Export
// ═══════════════════════════════════════════════════════════════

// ─── Components ────────────────────────────────────────────
export { Button, buttonVariants } from './components/button';
export type { ButtonProps } from './components/button';

export { Input } from './components/input';
export type { InputProps } from './components/input';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/card';

export { Label } from './components/label';

export { Skeleton } from './components/skeleton';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/dialog';

// ─── Theme ─────────────────────────────────────────────────
export { ThemeProvider, useTheme } from './components/theme-provider';

// ─── Utilities ─────────────────────────────────────────────
export { cn } from './lib/utils';
export { Toaster } from './toaster';
export { DataGrid } from './data-grid/data-grid';
export type { DataGridProps, DataGridColumn, ColumnMeta, ColumnFormat, ExcelColumnProperties } from './data-grid/data-grid';
export { getFormattedValue, exportExcel, exportCsv } from './data-grid/data-grid';
export { PaginationBar } from './data-grid/pagination-bar';
export type { PaginationBarProps } from './data-grid/pagination-bar';
export { CustomDataGrid } from './custom-data-grid';
export type { CustomDataGridProps } from './custom-data-grid';
export { RestDataSource, LocalDataSource, GridEventBus, GridEventType, SelectionPlugin, ScannerPlugin, defaultTheme, darkTheme, highContrastTheme } from './custom-data-grid';
export type { IDataSource, GridRequest, GridResponse, GridPlugin, GridFeatures, GridThemeTokens, ContextMenuItem, SortModel, FilterModel } from './custom-data-grid';

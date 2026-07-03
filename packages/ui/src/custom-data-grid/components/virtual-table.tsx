// @ts-nocheck
// Virtual Table — TanStack Table with keyboard nav, inline edit, pinning

import { useCallback, type KeyboardEvent } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel,
  flexRender, type ColumnDef, type SortingState, type VisibilityState,
  type RowSelectionState, type Row, type HeaderGroup, type Cell, type Updater,
  type ColumnMeta,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface Props<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  sorting: SortingState;
  onSortingChange: (s: SortingState) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (v: VisibilityState) => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (v: RowSelectionState) => void;
  enableSelection?: boolean;
  enableSorting?: boolean;
  enableColumnPinning?: boolean;
  density: { cell: string; font: string; row: string };
  onRowClick?: (row: TData) => void;
  onRowContextMenu?: (row: TData, e: { x: number; y: number }) => void;
  rowClassName?: (row: TData) => string | undefined;
  classNames?: { row?: string; cell?: string };
  focusedCell?: { row: number; col: string } | null;
  onFocusChange?: (cell: { row: number; col: string }) => void;
  editingCell?: { row: number; col: string } | null;
  onEditingCellChange?: (cell: { row: number; col: string } | null) => void;
  onCellEdit?: (rowIndex: number, columnId: string, value: unknown) => void;
  emitEvent?: (type: string, payload: unknown) => void;
}

export function VirtualTable<TData extends { id?: string | number }>({
  data, columns, sorting, onSortingChange, columnVisibility, onColumnVisibilityChange,
  rowSelection, onRowSelectionChange, enableSelection, enableSorting, enableColumnPinning,
  density, onRowClick, onRowContextMenu, rowClassName, classNames,
  focusedCell, onFocusChange, editingCell, onEditingCellChange, onCellEdit,
}: Props<TData>) {
  const table = useReactTable({
    data, columns,
    state: { sorting, columnVisibility, rowSelection },
    onSortingChange: onSortingChange as any,
    onColumnVisibilityChange: onColumnVisibilityChange as any,
    onRowSelectionChange: onRowSelectionChange as any,
    enableRowSelection: enableSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: false,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTableElement>) => {
    if (!onFocusChange || !focusedCell) return;
    const rows = table.getRowModel().rows;
    let r = focusedCell.row, c = focusedCell.col;
    switch (e.key) {
      case 'ArrowDown': r = Math.min(r + 1, rows.length - 1); break;
      case 'ArrowUp': r = Math.max(r - 1, 0); break;
      case 'ArrowLeft': {
        const cells = rows[r]?.getVisibleCells() || [];
        const idx = cells.findIndex((cl: any) => cl.id === c);
        if (idx > 0) c = cells[idx - 1]?.id || c; break;
      }
      case 'ArrowRight': {
        const cells = rows[r]?.getVisibleCells() || [];
        const idx = cells.findIndex((cl: any) => cl.id === c);
        if (idx < cells.length - 1) c = cells[idx + 1]?.id || c; break;
      }
      case ' ': e.preventDefault(); if (rows[r]) onRowSelectionChange({ ...rowSelection, [String(rows[r].original?.id)]: !rowSelection[String(rows[r].original?.id)] }); return;
      case 'Enter': onEditingCellChange?.(focusedCell); return;
      case 'Escape': onEditingCellChange?.(null); return;
      default: return;
    }
    onFocusChange({ row: r, col: c });
  }, [focusedCell, onFocusChange, table, rowSelection, onRowSelectionChange, onEditingCellChange]);

  return (
    <div className="overflow-auto rounded-lg border bg-card" style={{ maxHeight: '70vh' }}>
      <table className="w-full border-collapse" onKeyDown={handleKeyDown} tabIndex={0}>
        <thead className="sticky top-0 z-20">
          {table.getHeaderGroups().map((hg: HeaderGroup<TData>) => (
            <tr key={hg.id} className="border-b bg-muted/50">
              {enableSelection && <th className={`${density.cell} ${density.font} w-10 text-center sticky left-0 z-10 bg-muted/50`}>
                <input type="checkbox" className="h-4 w-4" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />
              </th>}
              {hg.headers.map(h => {
                const m = h.column.columnDef.meta as ColumnMeta<TData, unknown> | undefined;
                const cs = enableSorting && h.column.getCanSort();
                return (
                  <th key={h.id} className={`${density.cell} ${density.font} font-semibold text-muted-foreground whitespace-nowrap ${m?.align === 'right' ? 'text-right' : m?.align === 'center' ? 'text-center' : 'text-left'} ${cs ? 'cursor-pointer select-none hover:bg-accent/50' : ''} ${classNames?.cell ?? ''}`}
                    onClick={cs ? h.column.getToggleSortingHandler() : undefined} style={{ width: h.getSize(), minWidth: 80 }}>
                    <div className="flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {cs && <span className="shrink-0 text-muted-foreground/50">{h.column.getIsSorted() === 'asc' ? <ChevronUp size={14} /> : h.column.getIsSorted() === 'desc' ? <ChevronDown size={14} /> : <ChevronsUpDown size={14} />}</span>}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row: Row<TData>) => {
            const customCls = rowClassName?.(row.original);
            return (
              <tr key={row.id} className={`border-b transition-colors ${row.getIsSelected() ? 'bg-primary/5' : 'hover:bg-accent/50'} ${density.row} ${onRowClick ? 'cursor-pointer' : ''} ${classNames?.row ?? ''} ${customCls ?? ''}`}
                onClick={() => onRowClick?.(row.original)}
                onContextMenu={(e) => { e.preventDefault(); onRowContextMenu?.(row.original, { x: e.clientX, y: e.clientY }); }}>
                {enableSelection && <td className={`${density.cell} w-10 text-center sticky left-0 z-10 bg-card`}>
                  <input type="checkbox" className="h-4 w-4" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={e => e.stopPropagation()} />
                </td>}
                {row.getVisibleCells().map((cell: Cell<TData, unknown>) => {
                  const m = cell.column.columnDef.meta as ColumnMeta<TData, unknown> | undefined;
                  const isFocused = focusedCell?.row === row.index && focusedCell?.col === cell.id;
                  const isEditing = editingCell?.row === row.index && editingCell?.col === cell.id;
                  return (
                    <td key={cell.id} className={`${density.cell} ${density.font} ${m?.align === 'right' ? 'text-right' : m?.align === 'center' ? 'text-center' : 'text-left'} ${m?.cellClass ?? ''} ${classNames?.cell ?? ''} ${isFocused ? 'ring-2 ring-primary ring-inset' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onFocusChange?.({ row: row.index, col: cell.id }); }}
                      onDoubleClick={() => onEditingCellChange?.({ row: row.index, col: cell.id })}>
                      {isEditing ? (
                        <input className="w-full rounded border bg-background px-1 py-0.5 text-sm outline-none" autoFocus defaultValue={String(cell.getValue() ?? '')}
                          onBlur={(e) => { onCellEdit?.(row.index, cell.column.id, e.target.value); onEditingCellChange?.(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                      ) : m?.cellFormatter ? m.cellFormatter(cell.getValue()) : flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// @ts-nocheck
// Virtual Table — TanStack Table with keyboard nav, inline edit, pinning, drag-drop, audit

import { useCallback, useState, useRef, type KeyboardEvent, type DragEvent } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel,
  flexRender, type ColumnDef, type SortingState, type VisibilityState,
  type RowSelectionState, type Row, type HeaderGroup, type Cell,
  type ColumnMeta,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, GripVertical, Pin, PinOff, Info } from 'lucide-react';

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
  enableMultiSelect?: boolean;
  enableSorting?: boolean;
  enableColumnPinning?: boolean;
  enableRowPinning?: boolean;
  enableRowDragDrop?: boolean;
  enableColumnReorder?: boolean;
  enableColumnResize?: boolean;
  stripedRows?: boolean;
  enableAuditTrail?: boolean;
  density: { cell: string; font: string; row: string };
  onRowClick?: (row: TData) => void;
  onRowContextMenu?: (row: TData, e: { x: number; y: number }) => void;
  onRowDragEnd?: (dragIndex: number, dropIndex: number) => void;
  onRowPin?: (id: string, position: 'top' | 'bottom' | false) => void;
  onColumnReorder?: (fromIndex: number, toIndex: number) => void;
  rowClassName?: (row: TData) => string | undefined;
  focusedCell?: { row: number; col: string } | null;
  onFocusChange?: (cell: { row: number; col: string }) => void;
  editingCell?: { row: number; col: string } | null;
  onEditingCellChange?: (cell: { row: number; col: string } | null) => void;
  onCellEdit?: (rowIndex: number, columnId: string, value: unknown) => void;
  pinnedRows?: { top: string[]; bottom: string[] };
  auditHistory?: Record<string, any[]>;
  classNames?: { row?: string; cell?: string };
}

export function VirtualTable<TData extends { id?: string | number }>({
  data, columns, sorting, onSortingChange, columnVisibility, onColumnVisibilityChange,
  rowSelection, onRowSelectionChange, enableSelection, enableMultiSelect, enableSorting,
  enableColumnPinning, enableRowPinning, enableRowDragDrop, enableColumnReorder, enableColumnResize,
  stripedRows, enableAuditTrail, density,
  onRowClick, onRowContextMenu, onRowDragEnd, onRowPin, onColumnReorder, rowClassName,
  focusedCell, onFocusChange, editingCell, onEditingCellChange, onCellEdit,
  pinnedRows, auditHistory, classNames,
}: Props<TData>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [colDragIndex, setColDragIndex] = useState<number | null>(null);
  const [auditTooltip, setAuditTooltip] = useState<{ x: number; y: number; entries: any[] } | null>(null);
  const lastShiftIndex = useRef<number | null>(null);

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

  // ── Keyboard Navigation ──
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTableElement>) => {
    if (!onFocusChange || !focusedCell) return;
    const rows = table.getRowModel().rows;
    let r = focusedCell.row, c = focusedCell.col;

    const moveFocus = (newR: number, newC: string) => {
      onFocusChange({ row: newR, col: newC });
    };

    switch (e.key) {
      case 'ArrowDown': moveFocus(Math.min(r + 1, rows.length - 1), c); e.preventDefault(); break;
      case 'ArrowUp': moveFocus(Math.max(r - 1, 0), c); e.preventDefault(); break;
      case 'ArrowLeft': {
        const cells = rows[r]?.getVisibleCells() || [];
        const idx = cells.findIndex((cl: any) => cl.id === c);
        if (idx > 0) moveFocus(r, cells[idx - 1]?.id || c);
        e.preventDefault(); break;
      }
      case 'ArrowRight': {
        const cells = rows[r]?.getVisibleCells() || [];
        const idx = cells.findIndex((cl: any) => cl.id === c);
        if (idx < cells.length - 1) moveFocus(r, cells[idx + 1]?.id || c);
        e.preventDefault(); break;
      }
      case ' ': {
        e.preventDefault();
        if (rows[r]) {
          const id = String(rows[r].original?.id);
          if (e.shiftKey && enableMultiSelect && lastShiftIndex.current !== null) {
            // Shift+Click range selection
            const start = Math.min(lastShiftIndex.current, r);
            const end = Math.max(lastShiftIndex.current, r);
            const newSel = { ...rowSelection };
            for (let i = start; i <= end; i++) {
              newSel[String(rows[i].original?.id)] = true;
            }
            onRowSelectionChange(newSel);
          } else {
            const newSel = { ...rowSelection };
            if (newSel[id]) delete newSel[id]; else newSel[id] = true;
            onRowSelectionChange(newSel);
          }
          lastShiftIndex.current = r;
        }
        return;
      }
      case 'Enter': onEditingCellChange?.(focusedCell); e.preventDefault(); break;
      case 'Escape': onEditingCellChange?.(null); e.preventDefault(); break;
      default: return;
    }
  }, [focusedCell, onFocusChange, table, rowSelection, onRowSelectionChange, onEditingCellChange, enableMultiSelect]);

  // ── Row Drag & Drop ──
  const handleDragStart = (index: number) => (e: DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: DragEvent) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      onRowDragEnd?.(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ── Audit Trail Hover ──
  const handleCellMouseEnter = (row: TData, colId: string, e: React.MouseEvent) => {
    if (!enableAuditTrail || !auditHistory) return;
    const entries = auditHistory[`${row.id}:${colId}`] || auditHistory[String(row.id)] || [];
    if (entries.length > 0) {
      setAuditTooltip({ x: e.clientX, y: e.clientY, entries });
    }
  };

  const handleCellMouseLeave = () => setAuditTooltip(null);

  const isPinnedTop = (id: string | number | undefined) => pinnedRows?.top?.includes(String(id));
  const isPinnedBottom = (id: string | number | undefined) => pinnedRows?.bottom?.includes(String(id));

  return (
    <div className="overflow-auto rounded-lg border bg-card" style={{ maxHeight: '70vh' }}>
      <table className="w-full border-collapse" onKeyDown={handleKeyDown} tabIndex={0}>
        <thead className="sticky top-0 z-20">
          {table.getHeaderGroups().map((hg: HeaderGroup<TData>) => (
            <tr key={hg.id} className="border-b bg-muted/50">
              {enableRowDragDrop && <th className={`${density.cell} ${density.font} w-8`}></th>}
              {enableSelection && <th className={`${density.cell} ${density.font} w-10 text-center sticky left-0 z-10 bg-muted/50`}>
                <input type="checkbox" className="h-4 w-4" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />
              </th>}
              {enableRowPinning && <th className={`${density.cell} ${density.font} w-8`}></th>}
              {hg.headers.map((h, idx) => {
                const m = h.column.columnDef.meta as ColumnMeta<TData, unknown> | undefined;
                const cs = enableSorting && h.column.getCanSort();
                return (
                  <th key={h.id} className={`${density.cell} ${density.font} font-semibold text-muted-foreground whitespace-nowrap ${m?.align === 'right' ? 'text-right' : m?.align === 'center' ? 'text-center' : 'text-left'} ${cs ? 'cursor-pointer select-none hover:bg-accent/50' : ''} ${classNames?.cell ?? ''} ${enableColumnResize ? 'relative' : ''}`}
                    onClick={cs ? h.column.getToggleSortingHandler() : undefined}
                    style={{ width: h.getSize(), minWidth: 80 }}
                    draggable={enableColumnReorder}
                    onDragStart={enableColumnReorder ? () => setColDragIndex(idx) : undefined}
                    onDragOver={enableColumnReorder ? (e) => { e.preventDefault(); if (colDragIndex !== null && colDragIndex !== idx) onColumnReorder?.(colDragIndex, idx); } : undefined}
                    onDragEnd={enableColumnReorder ? () => setColDragIndex(null) : undefined}>
                    <div className="flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {cs && <span className="shrink-0 text-muted-foreground/50">{h.column.getIsSorted() === 'asc' ? <ChevronUp size={14} /> : h.column.getIsSorted() === 'desc' ? <ChevronDown size={14} /> : <ChevronsUpDown size={14} />}</span>}
                    </div>
                    {enableColumnResize && <div onMouseDown={h.getResizeHandler()} onTouchStart={h.getResizeHandler()} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-border hover:bg-primary" />}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {/* Pinned top rows */}
          {pinnedRows?.top?.map(id => {
            const row = table.getRowModel().rows.find(r => String(r.original?.id) === id);
            if (!row) return null;
            return renderRow(row, -1);
          })}
          {table.getRowModel().rows.map((row: Row<TData>, idx: number) => {
            if (isPinnedTop(row.original?.id) || isPinnedBottom(row.original?.id)) return null;
            return renderRow(row, idx);
          })}
          {/* Pinned bottom rows */}
          {pinnedRows?.bottom?.map(id => {
            const row = table.getRowModel().rows.find(r => String(r.original?.id) === id);
            if (!row) return null;
            return renderRow(row, -2);
          })}
        </tbody>
      </table>

      {/* Audit Trail Tooltip */}
      {auditTooltip && (
        <div className="fixed z-[9999] rounded-lg border bg-card px-3 py-2 shadow-xl text-xs" style={{ left: auditTooltip.x + 12, top: auditTooltip.y - 10 }}>
          <p className="font-semibold mb-1">Audit Trail</p>
          {auditTooltip.entries.map((e, i) => (
            <p key={i} className="text-muted-foreground">{e.changedBy} — {new Date(e.changedAt).toLocaleString()}</p>
          ))}
        </div>
      )}
    </div>
  );

  function renderRow(row: Row<TData>, idx: number) {
    const customCls = rowClassName?.(row.original);
    const isPinned = isPinnedTop(row.original?.id) || isPinnedBottom(row.original?.id);
    const isDragOver = dragOverIndex === idx && idx !== dragIndex;
    const rowStyle = stripedRows && idx % 2 === 1 ? 'bg-muted/30' : '';

    return (
      <tr key={row.id} className={`border-b transition-colors ${row.getIsSelected() ? 'bg-primary/5' : 'hover:bg-accent/50'} ${density.row} ${onRowClick ? 'cursor-pointer' : ''} ${rowStyle} ${isDragOver ? 'border-t-2 border-t-primary' : ''} ${classNames?.row ?? ''} ${customCls ?? ''} ${isPinned ? 'bg-muted/60 sticky' : ''}`}
        style={isPinnedTop(row.original?.id) ? { top: 0, zIndex: 5 } : isPinnedBottom(row.original?.id) ? { bottom: 0, zIndex: 5 } : {}}
        onClick={() => onRowClick?.(row.original)}
        onContextMenu={(e) => { e.preventDefault(); onRowContextMenu?.(row.original, { x: e.clientX, y: e.clientY }); }}
        draggable={enableRowDragDrop && !isPinned}
        onDragStart={handleDragStart(idx)}
        onDragOver={handleDragOver(idx)}
        onDragEnd={handleDragEnd}>
        {enableRowDragDrop && (
          <td className={`${density.cell} w-8 text-muted-foreground cursor-grab active:cursor-grabbing`}>
            <GripVertical size={14} />
          </td>
        )}
        {enableSelection && (
          <td className={`${density.cell} w-10 text-center sticky left-0 z-10 ${row.getIsSelected() ? 'bg-primary/5' : 'bg-card'}`}>
            <input type="checkbox" className="h-4 w-4" checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              onClick={(e) => { e.stopPropagation(); }}
              onPointerDown={(e) => {
                // Shift+Click support via pointer event
                if (e.shiftKey && enableMultiSelect && lastShiftIndex.current !== null) {
                  e.preventDefault();
                  const rows = table.getRowModel().rows;
                  const start = Math.min(lastShiftIndex.current, idx);
                  const end = Math.max(lastShiftIndex.current, idx);
                  const newSel = { ...rowSelection };
                  for (let i = start; i <= end; i++) {
                    newSel[String(rows[i]?.original?.id)] = true;
                  }
                  onRowSelectionChange(newSel);
                }
                lastShiftIndex.current = idx;
              }} />
          </td>
        )}
        {enableRowPinning && (
          <td className={`${density.cell} w-8 text-muted-foreground`}>
            {isPinnedTop(row.original?.id) ? (
              <button onClick={(e) => { e.stopPropagation(); onRowPin?.(String(row.original?.id), false); }} title="Unpin" className="hover:text-primary"><PinOff size={14} /></button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); onRowPin?.(String(row.original?.id), 'top'); }} title="Pin to top" className="hover:text-primary"><Pin size={14} /></button>
            )}
          </td>
        )}
        {row.getVisibleCells().map((cell: Cell<TData, unknown>) => {
          const m = cell.column.columnDef.meta as ColumnMeta<TData, unknown> | undefined;
          const isFocused = focusedCell?.row === row.index && focusedCell?.col === cell.id;
          const isEditing = editingCell?.row === row.index && editingCell?.col === cell.id;
          return (
            <td key={cell.id} className={`${density.cell} ${density.font} ${m?.align === 'right' ? 'text-right' : m?.align === 'center' ? 'text-center' : 'text-left'} ${m?.cellClass ?? ''} ${classNames?.cell ?? ''} ${isFocused ? 'ring-2 ring-primary ring-inset' : ''}`}
              onClick={(e) => { e.stopPropagation(); onFocusChange?.({ row: row.index, col: cell.id }); }}
              onDoubleClick={() => onEditingCellChange?.({ row: row.index, col: cell.id })}
              onMouseEnter={(e) => handleCellMouseEnter(row.original, cell.column.id, e)}
              onMouseLeave={handleCellMouseLeave}>
              {renderCellContent(cell, m, isEditing, isFocused, row, idx)}
            </td>
          );
        })}
      </tr>
    );
  }
}

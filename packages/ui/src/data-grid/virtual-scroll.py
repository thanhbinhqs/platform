"""Add virtual scrolling to DataGrid"""
path = '/home/binh/platform/packages/ui/src/data-grid/data-grid.tsx'
with open(path) as f:
    content = f.read()

changes = 0

# 1. Import useVirtualizer
old = "import { PaginationBar } from './pagination-bar';"
new = "import { useVirtualizer } from '@tanstack/react-virtual';\nimport { PaginationBar } from './pagination-bar';"
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("1. Added useVirtualizer import")

# 2. Add to destructuring
old = "  enableRowExpansion, renderRowDetail,\n  enableInlineEditing, onCellSave,"
new = "  enableRowExpansion, renderRowDetail,\n  enableInlineEditing, onCellSave,\n  enableVirtualScroll, virtualRowHeight = 40,"
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("2. Added to destructuring")

# 3. Add virtualizer after existing hooks + before the main return
old = """  },
    [table]);

  return ("""
new = """  },
    [table]);

  // Virtual scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const visibleData = enableVirtualScroll ? data : data;
  const virtualizer = useVirtualizer({
    count: enableVirtualScroll ? data.length : 0,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => virtualRowHeight,
    overscan: 5,
    enabled: enableVirtualScroll,
  });
  const virtualRows = enableVirtualScroll ? virtualizer.getVirtualItems() : [];

  return ("""
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("3. Added virtualizer hook")
else:
    print("3. SKIP - return marker not found!")
    idx = content.find('},[table]);')
    if idx >= 0:
        print(repr(content[idx:idx+200]))

# 4. Modify the table rendering - find the table container div and replace
old = """      <div className=\"flex-1 min-h-0 isolate rounded-lg border bg-card\" style={{ overflow: 'auto', maxHeight }}>"""
new = """      <div ref={tableContainerRef} className=\"flex-1 min-h-0 isolate rounded-lg border bg-card\" style={{ overflow: 'auto', maxHeight }}>"""
if old in content:
    content = content.replace(old, new)
    changes += 1
    print("4. Added ref to scroll container")
else:
    print("4. SKIP - table container not found!")

# 5. Replace the data.length > 0 block for virtual scrolling
old_data = """        {!isLoading && !error && data.length > 0 && (
          <table className=\"w-full border border-border border-collapse\" style={{ minWidth: Math.max(600, table.getTotalSize()), tableLayout: 'fixed' }}>
            <thead className=\"sticky top-0 z-30\">{table.getHeaderGroups().map(renderHead)}</thead>
            <tbody>{table.getRowModel().rows.map(renderRow)}</tbody>
            {showFooter && (
              <tfoot className=\"sticky bottom-0 z-20\">{renderFooter()}</tfoot>
            )}
          </table>
        )}"""
new_data = """        {!isLoading && !error && data.length > 0 && (
          <table className=\"w-full border border-border border-collapse\" style={{ minWidth: Math.max(600, table.getTotalSize()), tableLayout: 'fixed' }}>
            <thead className=\"sticky top-0 z-30\">{table.getHeaderGroups().map(renderHead)}</thead>
            <tbody style={enableVirtualScroll ? { height: virtualizer.getTotalSize(), position: 'relative' } : undefined}>
              {enableVirtualScroll ? (
                virtualRows.map(virtualRow => {
                  const row = table.getRowModel().rows[virtualRow.index];
                  return (
                    <tr key={row?.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: virtualRowHeight, transform: `translateY(${virtualRow.start}px)` }}>
                      {renderRowCells(row, virtualRow.index)}
                    </tr>
                  );
                })
              ) : (
                table.getRowModel().rows.map(renderRow)
              )}
            </tbody>
            {showFooter && (
              <tfoot className=\"sticky bottom-0 z-20\">{renderFooter()}</tfoot>
            )}
          </table>
        )}"""
if old_data in content:
    content = content.replace(old_data, new_data)
    changes += 1
    print("5. Added virtual scroll body")
else:
    print("5. SKIP - data block not found!")
    idx = content.find("!isLoading && !error && data.length > 0 && (")
    if idx >= 0:
        print("   Found data block")
        print(repr(content[idx:idx+500]))

# 6. Add renderRowCells helper (extracted cell rendering from renderRow)
old_renderrow = """  function renderRow(row: Row<TData>, rowIdx: number) {
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
        onContextMenu={(e) => { e.preventDefault(); setContextRowId(row.id); onRowContextMenu?.(row.original, { x: e.clientX, y: e.clientY }); }}>"""
if old_renderrow in content:
    new_renderrow = """  function renderRowCells(row: Row<TData>, rowIdx: number) {
    const isEven = rowIdx % 2 === 0;
    const isCtxRow = contextRowId === row.id;
    const rowBg = row.getIsSelected()
      ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)'
      : isCtxRow
        ? 'color-mix(in srgb, var(--color-accent) 80%, transparent)'
        : isEven ? 'var(--color-card)' : 'var(--color-muted)';
    return (<>
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
        return (
          <td key={cell.id} className={`${den.cell} ${den.font} border-r border-b border-border ${m?.align === 'right' ? 'text-right' : m?.align === 'center' ? 'text-center' : 'text-left'} ${m?.cellClass ?? ''} ${valClass} ${classNames.cell ?? ''} ${stickyAttr?.className ?? ''} ${enableInlineEditing && !isEditing ? 'cursor-pointer hover:bg-accent/30' : ''}`} style={{ ...(stickyAttr?.style ?? {}), backgroundColor: rowBg }}
            onDoubleClick={() => { if (enableInlineEditing) { startEditing(row.id, cell.column.id, String(cellRaw ?? '')); setTimeout(() => editInputRef.current?.focus(), 0); } }}>
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
    </>);
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
        onContextMenu={(e) => { e.preventDefault(); setContextRowId(row.id); onRowContextMenu?.(row.original, { x: e.clientX, y: e.clientY }); }}>"""
    content = content.replace(old_renderrow, new_renderrow)
    changes += 1
    print("6. Extracted renderRowCells + kept renderRow")
else:
    print("6. SKIP - renderRow not found!")
    idx = content.find('function renderRow(row:')
    if idx >= 0:
        print("   Found renderRow at", idx)
        print(repr(content[idx:idx+300]))

if changes >= 5:
    with open(path, 'w') as f:
        f.write(content)
    print(f"\nApplied {changes}/6 changes!")
else:
    print(f"\nOnly {changes}/6 changes, not saving!")

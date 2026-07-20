import re

with open('/home/binh/platform/packages/ui/src/data-grid/data-grid.tsx') as f:
    content = f.read()

# 1. Modify renderHead to add expand toggle column header
old_head = '''        {enableSelection && <th data-sticky-id="selection" className={`${den.cell} ${den.font} sticky text-center border-r border-b border-border`} style={{ left: selLeft, zIndex: 20, backgroundColor: 'var(--color-muted)', minWidth: 40, width: 40 }}><input type="checkbox" className="h-4 w-4" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} /></th>}
        {hg.headers.map'''

new_head = '''        {enableSelection && <th data-sticky-id="selection" className={`${den.cell} ${den.font} sticky text-center border-r border-b border-border`} style={{ left: selLeft, zIndex: 20, backgroundColor: 'var(--color-muted)', minWidth: 40, width: 40 }}><input type="checkbox" className="h-4 w-4" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} /></th>}
        {enableRowExpansion && <th className={`${den.cell} ${den.font} text-center border-r border-b border-border text-muted-foreground`} style={{ width: 36, minWidth: 36, backgroundColor: 'var(--color-muted)' }}></th>}
        {hg.headers.map'''

assert old_head in content, "HEADER MARKER NOT FOUND"
content = content.replace(old_head, new_head)
print("1/3 Header expand column added")

# 2. Modify renderRow to add expand toggle cell
old_row = '''        {enableSelection && <td data-sticky-id="selection" className={`${den.cell} sticky text-center border-r border-b border-border`} style={{ left: selLeft, zIndex: 10, minWidth: 40, width: 40, backgroundColor: rowBg }}><input type="checkbox" className="h-4 w-4" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={e => e.stopPropagation()} /></td>}
        {row.getVisibleCells()'''

new_row = '''        {enableSelection && <td data-sticky-id="selection" className={`${den.cell} sticky text-center border-r border-b border-border`} style={{ left: selLeft, zIndex: 10, minWidth: 40, width: 40, backgroundColor: rowBg }}><input type="checkbox" className="h-4 w-4" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} onClick={e => e.stopPropagation()} /></td>}
        {enableRowExpansion && (
          <td className={`${den.cell} ${den.font} text-center border-r border-b border-border cursor-pointer`} style={{ width: 36, minWidth: 36, backgroundColor: rowBg }} onClick={() => toggleRowExpanded(row.id)}>
            <ChevronRight size={14} className="inline-block transition-transform" style={{ transform: expandedRows.has(row.id) ? 'rotate(90deg)' : 'rotate(0deg)' }} />
          </td>
        )}
        {row.getVisibleCells()'''

assert old_row in content, "ROW MARKER NOT FOUND"
content = content.replace(old_row, new_row)
print("2/3 Row expand toggle added")

# 3. Add detail row after the renderRowActions if present, otherwise before </tr>
old_close = '''        {renderRowActions && (
          <td className={`${den.cell} ${den.font} border-r border-b border-border text-right whitespace-nowrap`} style={{ backgroundColor: rowBg }}>
            {renderRowActions(row.original)}
          </td>
        )}
      </tr>'''

if old_close not in content:
    # Try without renderRowActions
    old_close = '''      </tr>
    );
  }

  function renderHead('
'''

new_close = '''        {renderRowActions && (
          <td className={`${den.cell} ${den.font} border-r border-b border-border text-right whitespace-nowrap`} style={{ backgroundColor: rowBg }}>
            {renderRowActions(row.original)}
          </td>
        )}
      </tr>
      {enableRowExpansion && renderRowDetail && expandedRows.has(row.id) && (
        <tr className="border-b" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 3%, transparent)' }}>
          <td colSpan={table.getVisibleFlatColumns().length + (enableRowNumber ? 1 : 0) + (enableSelection ? 1 : 0) + (enableRowExpansion ? 1 : 0)} className="px-4 py-2 text-xs">
            {renderRowDetail(row.original)}
          </td>
        </tr>
      )}
    );
  }

  function renderHead(
'''

if old_close in content:
    content = content.replace(old_close, new_close)
    with open('/home/binh/platform/packages/ui/src/data-grid/data-grid.tsx', 'w') as f:
        f.write(content)
    print("3/3 Detail row added")
else:
    print("CLOSE MARKER NOT FOUND!")
    # debug
    idx = content.find('renderRowActions &&')
    if idx >= 0:
        print(f"renderRowActions found at {idx}")
        print(repr(content[idx:idx+250]))
    idx2 = content.find('</tr>\n    );\n  }\n\n  function renderHead')
    if idx2 >= 0:
        print(f"\n</tr> close found at {idx2}")
        print(repr(content[idx2-100:idx2]))
    else:
        idx3 = content.find('function renderHead')
        print(f"renderHead found")
        before = content[:idx3]
        print(repr(before[-200:]))

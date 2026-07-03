// Pagination — Centered current page with Previous/Next

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface Props {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  pageSizeOptions: number[];
  selectedCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  canPrevious: boolean;
  canNext: boolean;
}

export function PaginationBar({
  page, pageCount, total, pageSize, pageSizeOptions, selectedCount,
  onPageChange, onPageSizeChange, canPrevious, canNext,
}: Props) {
  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  // Generate page numbers with current page centered
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (pageCount <= maxVisible) {
      for (let i = 1; i <= pageCount; i++) pages.push(i);
      return pages;
    }

    // Always show first, last, and center around current
    pages.push(1);
    let start = Math.max(2, page - 2);
    let end = Math.min(pageCount - 1, page + 2);

    if (page <= 3) { start = 2; end = Math.min(5, pageCount - 1); }
    if (page >= pageCount - 2) { start = Math.max(2, pageCount - 4); end = pageCount - 1; }

    if (start > 2) pages.push('ellipsis');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < pageCount - 1) pages.push('ellipsis');
    pages.push(pageCount);

    return pages;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2 text-sm">
      {/* Left: record info */}
      <div className="text-xs text-muted-foreground">
        {startRow}–{endRow} of {total}
        {selectedCount > 0 && ` · ${selectedCount} selected`}
      </div>

      {/* Center: page numbers with current centered */}
      <div className="flex items-center gap-1">
        <button className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
          disabled={!canPrevious} onClick={() => onPageChange(1)}>
          <ChevronsLeft size={16} />
        </button>
        <button className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
          disabled={!canPrevious} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={16} />
        </button>

        {getPageNumbers().map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <button key={p}
              className={`min-w-[2rem] rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                p === page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
              onClick={() => onPageChange(p)}>
              {p}
            </button>
          )
        )}

        <button className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
          disabled={!canNext} onClick={() => onPageChange(page + 1)}>
          <ChevronRight size={16} />
        </button>
        <button className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
          disabled={!canNext} onClick={() => onPageChange(pageCount)}>
          <ChevronsRight size={16} />
        </button>
      </div>

      {/* Right: page size */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Rows per page:</label>
        <select className="h-7 rounded-md border bg-background px-2 text-xs outline-none"
          value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
          {pageSizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationBarProps {
  /** 0‑based page index */
  pageIndex: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items (not just current page) */
  total: number;
  /** Called when user navigates to a page */
  onPageChange: (page: number) => void;
  /** Called when user changes page size */
  onPageSizeChange: (pageSize: number) => void;
  /** Available page size options (default: [10, 20, 50, 100]) */
  pageSizeOptions?: number[];
  /** Optional CSS class */
  className?: string;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function PaginationBar({
  pageIndex,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className = '',
}: PaginationBarProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const startOffset = total === 0 ? 0 : pageIndex * pageSize + 1;
  const endOffset = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div
      className={`shrink-0 flex flex-wrap items-center justify-between gap-3 border-t bg-card px-4 py-2 text-sm ${className}`}
    >
      {/* Page info */}
      <div className="text-xs text-muted-foreground">
        {total === 0 ? (
          '0 results'
        ) : (
          <>
            {startOffset}–{endOffset} of {total}
          </>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
          disabled={pageIndex === 0}
          onClick={() => onPageChange(0)}
          aria-label="First page"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
          disabled={pageIndex === 0}
          onClick={() => onPageChange(pageIndex - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-3 text-xs font-medium">
          Page {total === 0 ? 1 : pageIndex + 1} of {total === 0 ? 1 : pageCount}
        </span>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageIndex + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageCount - 1)}
          aria-label="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>

      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground whitespace-nowrap">
          Rows per page:
        </label>
        <select
          className="h-7 rounded-md border bg-background px-2 text-xs outline-none"
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(0);
          }}
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

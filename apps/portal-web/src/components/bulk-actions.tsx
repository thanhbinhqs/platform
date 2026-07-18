import { useState, type ReactNode } from 'react';
import { Button } from '@platform/ui';

export interface BulkAction {
  label: string;
  icon?: ReactNode;
  onClick: (selectedIds: string[]) => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

interface Props {
  selectedIds: string[];
  actions: BulkAction[];
  label?: string;
}

export function BulkActions({ selectedIds, actions, label }: Props) {
  const [open, setOpen] = useState(false);

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {label || `${selectedIds.length} selected`}
      </span>
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(!open)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        >
          Bulk Actions ▾
        </Button>
        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md">
            {actions.map((a, i) => (
              <button
                key={i}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={a.disabled}
                onMouseDown={(e) => { e.preventDefault(); a.onClick(selectedIds); setOpen(false); }}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

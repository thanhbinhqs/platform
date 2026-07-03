// Panel Header — Title, bulk actions, export, settings

import { Download, Columns, SlidersHorizontal, Eye, EyeOff, X, Search } from 'lucide-react';
import { useState, useRef, useEffect, type ReactNode, type ChangeEvent } from 'react';
import { useGridSelector } from '../store';

interface Props {
  title?: string;
  globalSearch: string;
  onSearchChange: (v: string) => void;
  columns: { id: string; header: string }[];
  visibility: Record<string, boolean>;
  onVisibilityChange: (v: Record<string, boolean>) => void;
  density: string;
  onDensityChange: (v: string) => void;
  selectedCount: number;
  bulkActions?: ReactNode;
  actionButtons?: ReactNode;
  onExport?: () => void;
  searchPlaceholder?: string;
}

export function PanelHeader({
  title, globalSearch, onSearchChange, columns, visibility, onVisibilityChange,
  density, onDensityChange, selectedCount, bulkActions, actionButtons,
  onExport, searchPlaceholder = 'Search…',
}: Props) {
  const [showColMenu, setShowColMenu] = useState(false);
  const [showDenMenu, setShowDenMenu] = useState(false);
  const colRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (colRef.current && !colRef.current.contains(e.target as Node)) setShowColMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const densities = [
    { key: 'compact', label: 'Compact' },
    { key: 'standard', label: 'Standard' },
    { key: 'comfortable', label: 'Comfortable' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-3">
        {title && <h2 className="text-lg font-bold tracking-tight">{title}</h2>}
        {selectedCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {selectedCount} selected
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder={searchPlaceholder}
            className="h-8 w-44 rounded-md border bg-background pl-8 pr-8 text-sm outline-none focus:border-primary"
            value={globalSearch} onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)} />
          {globalSearch && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchChange('')}><X size={14} /></button>
          )}
        </div>

        {selectedCount > 0 && bulkActions}
        {actionButtons}

        {/* Export */}
        {onExport && (
          <button className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-accent"
            onClick={onExport}>
            <Download size={14} /> Export
          </button>
        )}

        {/* Column Visibility */}
        <div className="relative" ref={colRef}>
          <button className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-accent"
            onClick={() => setShowColMenu(!showColMenu)}>
            <Columns size={14} /> Columns
          </button>
          {showColMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-card shadow-xl">
              <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">Column Visibility</div>
              {columns.map((col) => {
                const vis = visibility[col.id] !== false;
                return (
                  <button key={col.id} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                    onClick={() => onVisibilityChange({ ...visibility, [col.id]: !vis })}>
                    {vis ? <Eye size={14} /> : <EyeOff size={14} />} {col.header}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Density */}
        <div className="relative">
          <button className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-accent"
            onClick={() => setShowDenMenu(!showDenMenu)}>
            <SlidersHorizontal size={14} /> {densities.find(d => d.key === density)?.label ?? 'Density'}
          </button>
          {showDenMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border bg-card shadow-xl"
              onMouseLeave={() => setShowDenMenu(false)}>
              {densities.map(d => (
                <button key={d.key}
                  className={`flex w-full items-center px-3 py-1.5 text-sm hover:bg-accent ${density === d.key ? 'font-semibold text-primary' : ''}`}
                  onClick={() => { onDensityChange(d.key); setShowDenMenu(false); }}>{d.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

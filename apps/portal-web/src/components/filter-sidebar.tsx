// FilterSidebar — Standalone filter sidebar for use alongside DataGrid
// Mirrors the AppDataGrid filter sidebar but works with DataGrid directly

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

export interface FilterField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multi-select' | 'checkbox' | 'date-range' | 'number-range';
  options?: { label: string; value: string }[];
  placeholder?: string;
  /** Required permission to see this filter field */
  permission?: string | string[];
}

export interface ActiveFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface FilterSidebarProps {
  filterFields: FilterField[];
  activeFilters: ActiveFilter[];
  onActiveFiltersChange: (filters: ActiveFilter[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  show: boolean;
  onToggle: (show: boolean) => void;
  /** Optional permission check function (returns true if permitted) */
  hasPermission?: (perm?: string | string[]) => boolean;
}

// ─── Hook: debounce ──────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── DebouncedInput component ────────────────────────────────────

/** Controlled input that delays `onChange` until `debounceMs` of inactivity. */
function DebouncedInput({
  value: externalValue,
  onChange,
  placeholder,
  type = 'text',
  className,
  debounceMs = 400,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  debounceMs?: number;
}) {
  const [local, setLocal] = useState(externalValue);
  const debounced = useDebounce(local, debounceMs);

  // Sync local value when external value changes (e.g., clear filters)
  useEffect(() => {
    setLocal(externalValue);
  }, [externalValue]);

  // Fire onChange when debounced value settles
  useEffect(() => {
    if (debounced !== externalValue) {
      onChange(debounced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <input
      type={type}
      className={className || 'w-full rounded border bg-background px-2 py-1 text-xs'}
      placeholder={placeholder}
      value={local}
      onChange={e => setLocal(e.target.value)}
    />
  );
}

// ─── Component ───────────────────────────────────────────────────

export function FilterSidebar({
  filterFields,
  activeFilters,
  onActiveFiltersChange,
  searchQuery,
  onSearchChange,
  show,
  onToggle,
  hasPermission,
}: FilterSidebarProps) {
  // ── Filter by permission ──
  const visibleFields = useMemo(
    () => (hasPermission ? filterFields.filter(f => hasPermission(f.permission)) : filterFields),
    [filterFields, hasPermission],
  );

  const addFilter = (field: FilterField) => {
    onActiveFiltersChange([...activeFilters, { field: field.id || '', operator: 'contains', value: '' }]);
  };

  const removeFilter = (idx: number) => {
    onActiveFiltersChange(activeFilters.filter((_, i) => i !== idx));
  };

  const updateFilter = (idx: number, field: string, val: unknown) => {
    onActiveFiltersChange(activeFilters.map((f, i) => (i === idx ? { ...f, [field]: val } : f)));
  };

  if (!show) return null;

  return (
    <>
      {/* Overlay backdrop on mobile */}
      <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => onToggle(false)} />
      <div className="fixed left-0 top-0 z-50 h-full w-72 border-r bg-card overflow-y-auto p-3 space-y-2 shadow-xl lg:static lg:z-auto lg:shadow-none lg:border-r lg:h-auto lg:overflow-visible lg:w-72 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-1"><Filter size={14} /> Filters</h3>
          <button className="rounded p-1 hover:bg-accent lg:hidden" onClick={() => onToggle(false)}><X size={14} /></button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search all…"
            className="h-8 w-full rounded-md border bg-background pl-8 pr-8 text-sm outline-none focus:border-primary"
            value={searchQuery} onChange={e => onSearchChange(e.target.value)} />
          {searchQuery && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchChange('')}><X size={14} /></button>
          )}
        </div>

        {/* Filter field selector */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Add filter</p>
          <div className="flex flex-wrap gap-1.5">
            {visibleFields.filter(f => !activeFilters.find(af => af.field === f.id)).map(f => (
              <button key={f.id}
                className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent hover:border-primary/40 transition-colors"
                onClick={() => addFilter(f)}>
                <span className="text-muted-foreground">+</span> {f.label}
              </button>
            ))}
            {visibleFields.every(f => activeFilters.find(af => af.field === f.id)) && (
              <p className="text-xs text-muted-foreground italic">All filters added</p>
            )}
          </div>
        </div>

        {/* Active filters */}
        {activeFilters.map((af, idx) => {
          const fieldDef = visibleFields.find(f => f.id === af.field);
          if (!fieldDef) return null;
          return (
            <div key={idx} className="rounded-lg border p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{fieldDef.label}</span>
                <button className="rounded p-0.5 text-red-500 hover:bg-red-50" onClick={() => removeFilter(idx)}><X size={12} /></button>
              </div>
              {fieldDef.type === 'text' && (
                <DebouncedInput
                  value={String(af.value)}
                  onChange={v => updateFilter(idx, 'value', v)}
                  placeholder={fieldDef.placeholder || 'Filter...'}
                  debounceMs={400}
                />
              )}
              {fieldDef.type === 'select' && fieldDef.options && (
                <select className="w-full rounded border bg-background px-2 py-1 text-xs" value={String(af.value)} onChange={e => updateFilter(idx, 'value', e.target.value)}>
                  <option value="">All</option>
                  {fieldDef.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              {fieldDef.type === 'multi-select' && fieldDef.options && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {fieldDef.options.map(o => (
                    <label key={o.value} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" className="h-3 w-3" checked={String(af.value).includes(o.value)}
                        onChange={() => {
                          const current = String(af.value);
                          const vals = current ? current.split(',') : [];
                          const idx2 = vals.indexOf(o.value);
                          if (idx2 >= 0) vals.splice(idx2, 1); else vals.push(o.value);
                          updateFilter(idx, 'value', vals.join(','));
                        }} />
                      {o.label}
                    </label>
                  ))}
                </div>
              )}
              {fieldDef.type === 'checkbox' && (
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" className="h-3 w-3" checked={Boolean(af.value)} onChange={e => updateFilter(idx, 'value', e.target.checked)} />
                  Enabled
                </label>
              )}
              {fieldDef.type === 'date-range' && (
                <div className="flex gap-1">
                  <input type="date" className="flex-1 rounded border bg-background px-2 py-1 text-xs" value={String(af.value).split(',')[0] || ''} onChange={e => updateFilter(idx, 'value', e.target.value + ',')} />
                  <input type="date" className="flex-1 rounded border bg-background px-2 py-1 text-xs" value={String(af.value).split(',')[1] || ''} onChange={e => updateFilter(idx, 'value', (String(af.value).split(',')[0] || '') + ',' + e.target.value)} />
                </div>
              )}
              {fieldDef.type === 'number-range' && (
                <div className="flex gap-1">
                  <DebouncedInput type="number" className="flex-1 rounded border bg-background px-2 py-1 text-xs" placeholder="Min" value={String(af.value).split(',')[0] || ''} onChange={v => updateFilter(idx, 'value', v + ',')} debounceMs={400} />
                  <DebouncedInput type="number" className="flex-1 rounded border bg-background px-2 py-1 text-xs" placeholder="Max" value={String(af.value).split(',')[1] || ''} onChange={v => updateFilter(idx, 'value', (String(af.value).split(',')[0] || '') + ',' + v)} debounceMs={400} />
                </div>
              )}
            </div>
          );
        })}
        {activeFilters.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No filters applied. Click a filter above to add.</p>
        )}

        {/* Apply/Clear */}
        {activeFilters.length > 0 && (
          <div className="flex gap-2 pt-2">
            <button className="flex-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => onActiveFiltersChange([...activeFilters])}>Apply</button>
            <button className="rounded bg-muted px-3 py-1.5 text-xs hover:bg-accent"
              onClick={() => onActiveFiltersChange([])}>Clear</button>
          </div>
        )}
      </div>
    </>
  );
}

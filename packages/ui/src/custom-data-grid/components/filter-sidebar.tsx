// @ts-nocheck
// Filter Sidebar — Query builder + saved views

import { useState } from 'react';
import { X, Plus, Save, Search } from 'lucide-react';
import type { FilterModel } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterModel[];
  onFiltersApply: (filters: FilterModel[]) => void;
  columns: { id: string; header: string; type?: string }[];
}

export function FilterSidebar({ isOpen, onClose, filters, onFiltersApply, columns }: Props) {
  const [localFilters, setLocalFilters] = useState<FilterModel[]>(filters);
  const [savedViews, setSavedViews] = useState<{ name: string; filters: FilterModel[] }[]>([]);
  const [viewName, setViewName] = useState('');

  if (!isOpen) return null;

  const addFilter = () => {
    setLocalFilters([...localFilters, { field: columns[0]?.id || 'id', operator: 'contains', value: '' }]);
  };

  const updateFilter = (i: number, field: string, val: unknown) => {
    const f = [...localFilters];
    f[i] = { ...f[i], [field]: val };
    setLocalFilters(f);
  };

  const removeFilter = (i: number) => setLocalFilters(filters.filter((_, idx) => idx !== i));

  const saveView = () => {
    if (viewName) {
      setSavedViews([...savedViews, { name: viewName, filters: [...localFilters] }]);
      setViewName('');
    }
  };

  return (
    <div className="w-72 shrink-0 border-r bg-card p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Filters</h3>
        <button onClick={onClose} className="rounded p-1 hover:bg-accent"><X size={16} /></button>
      </div>

      {/* Saved Views */}
      {savedViews.length > 0 && (
        <div className="mb-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Saved Views</p>
          {savedViews.map((v, i) => (
            <button key={i} className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent"
              onClick={() => setLocalFilters([...v.filters])}>
              <Save size={12} /> {v.name}
            </button>
          ))}
        </div>
      )}

      {/* Active Filters */}
      <div className="space-y-2">
        {localFilters.map((f, i) => (
          <div key={i} className="space-y-1 rounded border p-2">
            <select className="w-full rounded border bg-background px-2 py-1 text-xs" value={f.field}
              onChange={e => updateFilter(i, 'field', e.target.value)}>
              {columns.map(c => <option key={c.id} value={c.id}>{c.header}</option>)}
            </select>
            <select className="w-full rounded border bg-background px-2 py-1 text-xs" value={f.operator}
              onChange={e => updateFilter(i, 'operator', e.target.value)}>
              <option value="contains">Contains</option>
              <option value="eq">Equals</option>
              <option value="neq">Not equals</option>
              <option value="gt">Greater than</option>
              <option value="lt">Less than</option>
              <option value="gte">Greater or equal</option>
              <option value="lte">Less or equal</option>
              <option value="startsWith">Starts with</option>
              <option value="endsWith">Ends with</option>
            </select>
            <div className="flex items-center gap-1">
              <input className="flex-1 rounded border bg-background px-2 py-1 text-xs" value={String(f.value)}
                onChange={e => updateFilter(i, 'value', e.target.value)} />
              <button onClick={() => removeFilter(i)} className="rounded p-0.5 text-red-500 hover:bg-red-50">
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={addFilter}>
        <Plus size={12} /> Add filter
      </button>

      <div className="mt-4 flex gap-2">
        <button className="flex-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          onClick={() => onFiltersApply(localFilters)}>
          Apply Filters
        </button>
        <button className="rounded bg-muted px-3 py-1.5 text-xs hover:bg-accent"
          onClick={() => setLocalFilters([])}>
          Clear
        </button>
      </div>

      <div className="mt-4 flex items-center gap-1">
        <input className="flex-1 rounded border bg-background px-2 py-1 text-xs" placeholder="Save view as…"
          value={viewName} onChange={e => setViewName(e.target.value)} />
        <button className="rounded bg-muted px-2 py-1 text-xs hover:bg-accent" onClick={saveView} disabled={!viewName}>
          <Save size={12} />
        </button>
      </div>
    </div>
  );
}

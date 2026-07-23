import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Loader2, Search, Check, Minus } from 'lucide-react';

interface BoundaryItem {
  id: string;
  label: string;
}

interface BoundarySearchControlProps {
  endpoint?: string;
  displayField?: string;
  valueField?: string;
  requestDebounceMs?: number;
  boundaryMin?: number | string;
  boundaryMax?: number | string;
  value: string;
  onChange: (value: string) => void;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  inputType?: 'text' | 'number' | 'date' | 'time';
  multiple?: boolean;
}

export function BoundarySearchControl({
  endpoint,
  displayField = 'name',
  valueField = 'id',
  requestDebounceMs = 300,
  boundaryMin,
  boundaryMax,
  value,
  onChange,
  fromPlaceholder = 'From',
  toPlaceholder = 'To',
  inputType = 'text',
  multiple = false,
}: BoundarySearchControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Single mode (range) ──
  const [fromVal, setFromVal] = useState(value.split(',')[0] || '');
  const [toVal, setToVal] = useState(value.split(',')[1] || '');

  useEffect(() => {
    if (!multiple) {
      setFromVal(value.split(',')[0] || '');
      setToVal(value.split(',')[1] || '');
    }
  }, [value, multiple]);

  if (!multiple) {
    return (
      <div ref={containerRef} className="relative">
        <div className="flex items-center gap-1">
          <input type={inputType}
            className="flex-1 rounded border bg-background px-2 py-1.5 text-xs"
            placeholder={fromPlaceholder}
            min={boundaryMin} max={boundaryMax}
            value={fromVal}
            onChange={e => { setFromVal(e.target.value); onChange(`${e.target.value},${toVal}`); }} />
          <Minus size={12} className="shrink-0 text-muted-foreground" />
          <input type={inputType}
            className="flex-1 rounded border bg-background px-2 py-1.5 text-xs"
            placeholder={toPlaceholder}
            min={boundaryMin} max={boundaryMax}
            value={toVal}
            onChange={e => { setToVal(e.target.value); onChange(`${fromVal},${e.target.value}`); }} />
        </div>
      </div>
    );
  }

  // ── Multiple mode (tag picker from API) ──
  const [input, setInput] = useState('');
  const [results, setResults] = useState<BoundaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIds = value ? value.split(',').filter(Boolean) : [];

  // Click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (term: string) => {
    if (!endpoint || !term) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const sep = endpoint.includes('?') ? '&' : '?';
      const url = `${endpoint}${sep}q=${encodeURIComponent(term)}&limit=10`;
      const token = localStorage.getItem('accessToken');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items: BoundaryItem[] = (json.data || json || []).map((item: any) => ({
        id: String(item[valueField] || item.id),
        label: item[displayField] || item.name || item.username || String(item.id),
      }));
      setResults(items);
      setOpen(items.length > 0);
    } catch { setResults([]); } finally { setLoading(false); }
  }, [endpoint, displayField, valueField]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), requestDebounceMs);
    setOpen(true);
  };

  const toggleItem = (item: BoundaryItem) => {
    const current = [...selectedIds];
    const idx = current.indexOf(item.id);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(item.id);
    onChange(current.join(','));
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  return (
    <div ref={containerRef} className="relative space-y-1">
      {/* Selected boundary chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map(id => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium">
              <span className="truncate max-w-[120px]">{id}</span>
              <button className="rounded-full p-0.5 hover:bg-primary/20" onClick={() => {
                const current = selectedIds.filter(x => x !== id);
                onChange(current.join(','));
              }}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Search input for adding boundaries */}
      {endpoint ? (
        <div className="relative">
          <input type="text" className="w-full rounded border bg-background px-2 py-1.5 pr-7 text-xs"
            placeholder={selectedIds.length > 0 ? 'Add boundary...' : 'Search boundaries...'}
            value={input} onChange={handleInputChange}
            onFocus={() => input.length > 0 && results.length > 0 && setOpen(true)} />
          {loading && <Loader2 size={14} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
      ) : (
        <input type="text" className="w-full rounded border bg-background px-2 py-1.5 text-xs"
          placeholder="Enter comma-separated values..."
          value={value} onChange={e => onChange(e.target.value)} />
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
          {results.map(item => (
            <button key={item.id} className="w-full px-2.5 py-2 text-left text-xs flex items-center gap-2 hover:bg-accent"
              onClick={() => toggleItem(item)}>
              <Search size={12} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{item.label}</span>
              {isSelected(item.id) && <Check size={12} className="shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

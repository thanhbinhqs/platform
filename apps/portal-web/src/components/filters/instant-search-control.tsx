import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Loader2, Search, Check } from 'lucide-react';

interface InstantSearchResult {
  id: string;
  label: string;
}

interface InstantSearchControlProps {
  endpoint: string;
  displayField?: string;
  valueField?: string;
  debounceMs?: number;
  resultLimit?: number;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiple?: boolean;
}

export function InstantSearchControl({
  endpoint,
  displayField = 'name',
  valueField = 'id',
  debounceMs = 300,
  resultLimit = 10,
  value,
  onChange,
  placeholder = 'Search...',
  multiple = false,
}: InstantSearchControlProps) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<InstantSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<Record<string, string>>({});
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIds = value ? value.split(',').filter(Boolean) : [];

  // Load labels for pre-selected IDs (multi mode on mount)
  useEffect(() => {
    if (!multiple || selectedIds.length === 0) return;
    const ids = selectedIds.filter(id => !selectedLabels[id]);
    if (ids.length === 0) return;
    (async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const promises = ids.map(async (id: string) => {
          const sep = endpoint.includes('?') ? '&' : '?';
          const resp = await fetch(`${endpoint}${sep}id=${encodeURIComponent(id)}&limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!resp.ok) return { id, label: id };
          const json = await resp.json();
          const item = (json.data?.data || json.data || json || [])[0];
          return { id, label: item?.[displayField] || item?.name || item?.username || id };
        });
        const labels = await Promise.all(promises);
        const map: Record<string, string> = {};
        labels.forEach(l => { map[l.id] = l.label; });
        setSelectedLabels(prev => ({ ...prev, ...map }));
      } catch { /* ignore */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (term: string) => {
    if (!term || term.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const sep = endpoint.includes('?') ? '&' : '?';
      const url = `${endpoint}${sep}q=${encodeURIComponent(term)}&limit=${resultLimit}`;
      const token = localStorage.getItem('accessToken');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const raw = json.data?.data || json.data || json || [];
      const items: InstantSearchResult[] = (Array.isArray(raw) ? raw : []).map((item: any) => ({
        id: String(item[valueField] || item.id),
        label: item[displayField] || item.name || item.username || item.email || String(item.id),
      }));
      setResults(items);
      setOpen(items.length > 0);
      setHighlightIdx(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, displayField, valueField, resultLimit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), debounceMs);
    setOpen(true);
  };

  const selectItem = (item: InstantSearchResult) => {
    if (multiple) {
      const current = [...selectedIds];
      const idx = current.indexOf(item.id);
      if (idx >= 0) current.splice(idx, 1);
      else current.push(item.id);
      setSelectedLabels(prev => ({ ...prev, [item.id]: item.label }));
      onChange(current.join(','));
      setInput('');
    } else {
      setSelectedLabels({ [item.id]: item.label });
      setInput('');
      setOpen(false);
      onChange(item.id);
    }
  };

  const removeItem = (id: string) => {
    const current = selectedIds.filter(x => x !== id);
    const newLabels = { ...selectedLabels };
    delete newLabels[id];
    setSelectedLabels(newLabels);
    onChange(current.join(','));
  };

  const clearSelection = () => {
    setSelectedLabels({});
    setInput('');
    setResults([]);
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && highlightIdx >= 0 && results[highlightIdx]) { e.preventDefault(); selectItem(results[highlightIdx]); }
    if (e.key === 'Escape') { setOpen(false); }
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  return (
    <div ref={containerRef} className="relative space-y-1">
      {/* Selected items as chips */}
      {(multiple ? selectedIds : selectedIds.slice(0, 1)).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(multiple ? selectedIds : selectedIds.slice(0, 1)).map(id => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium max-w-full">
              <span className="truncate">{selectedLabels[id] || id}</span>
              <button className="rounded-full p-0.5 hover:bg-primary/20 shrink-0" onClick={() => removeItem(id)}>
                <X size={10} />
              </button>
            </span>
          ))}
          {!multiple && <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={clearSelection}>Change</button>}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          className="w-full rounded border bg-background px-2 py-1.5 pr-7 text-xs"
          placeholder={selectedIds.length > 0 && multiple ? 'Add more...' : placeholder}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => input.length > 0 && results.length > 0 && setOpen(true)}
        />
        {loading && <Loader2 size={14} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
          {results.map((item, i) => {
            const sel = isSelected(item.id);
            return (
              <button
                key={item.id}
                className={`w-full px-2.5 py-2 text-left text-xs flex items-center gap-2 ${
                  i === highlightIdx ? 'bg-accent' : ''
                } ${sel ? 'bg-primary/5' : ''}`}
                onClick={() => selectItem(item)}
                onMouseEnter={() => setHighlightIdx(i)}
              >
                <Search size={12} className="shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{item.label}</span>
                {sel && <Check size={12} className="shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

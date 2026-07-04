// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// Data Source — Abstract data layer (REST, Local, etc.)
// ═══════════════════════════════════════════════════════════════

import type { IDataSource, GridRequest, GridResponse } from './types';

// ─── Simple HTTP helper (no external dependency) ──────────────────
async function httpRequest(url: string, options?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...options?.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: options?.method || 'GET', headers, body: options?.body ? JSON.stringify(options.body) : undefined });
  return res.json();
}

// ─── REST Data Source ────────────────────────────────────────────
export class RestDataSource<TData extends Record<string, unknown>> implements IDataSource<TData> {
  name = 'REST';

  constructor(private baseUrl: string, private options?: { transform?: (data: TData) => TData }) {}

  async load(request: GridRequest): Promise<GridResponse<TData>> {
    const params = new URLSearchParams();
    params.set('page', String(request.page));
    params.set('limit', String(request.pageSize));
    if (request.globalSearch) params.set('search', request.globalSearch);
    if (request.sorts?.length) {
      params.set('sortField', request.sorts[0].field);
      params.set('sortDir', request.sorts[0].dir);
    }
    const r = await httpRequest(`${this.baseUrl}?${params}`);
    const d = r.data || r;
    const items: TData[] = this.options?.transform ? (d.data || d).map((item: TData) => this.options!.transform!(item)) : (d.data || d);
    return {
      data: items,
      total: d.total ?? items.length,
      page: d.page ?? request.page,
      pageSize: d.limit ?? request.pageSize,
      totalPages: d.totalPages ?? Math.ceil((d.total ?? items.length) / request.pageSize),
    };
  }

  async create(data: Partial<TData>): Promise<TData> {
    const r = await httpRequest(this.baseUrl, { method: 'POST', body: data });
    return r.data || r;
  }

  async update(id: string | number, data: Partial<TData>): Promise<TData> {
    const r = await httpRequest(`${this.baseUrl}/${id}`, { method: 'PUT', body: data });
    return r.data || r;
  }

  async delete(id: string | number): Promise<boolean> {
    await httpRequest(`${this.baseUrl}/${id}`, { method: 'DELETE' });
    return true;
  }

  async bulkDelete(ids: (string | number)[]): Promise<boolean> {
    await httpRequest(`${this.baseUrl}/bulk-delete`, { method: 'POST', body: { ids } });
    return true;
  }

  async reorder(ids: (string | number)[]): Promise<boolean> {
    await httpRequest(`${this.baseUrl}/reorder`, { method: 'POST', body: { ids } });
    return true;
  }
}

// ─── Local Array Data Source ─────────────────────────────────────
export class LocalDataSource<TData extends Record<string, unknown>> implements IDataSource<TData> {
  name = 'Local';
  private allData: TData[];

  constructor(data: TData[]) { this.allData = [...data]; }

  setData(data: TData[]) { this.allData = [...data]; }

  async load(request: GridRequest): Promise<GridResponse<TData>> {
    let filtered = [...this.allData];
    if (request.globalSearch) {
      const q = request.globalSearch.toLowerCase();
      filtered = filtered.filter((item) => Object.values(item).some((v) => String(v).toLowerCase().includes(q)));
    }
    if (request.sorts?.length) {
      const s = request.sorts[0];
      filtered.sort((a, b) => {
        const av = String(a[s.field as keyof TData] ?? '');
        const bv = String(b[s.field as keyof TData] ?? '');
        return s.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    const total = filtered.length;
    const start = (request.page - 1) * request.pageSize;
    const data = filtered.slice(start, start + request.pageSize);
    return { data, total, page: request.page, pageSize: request.pageSize, totalPages: Math.ceil(total / request.pageSize) };
  }

  async create(data: Partial<TData>): Promise<TData> {
    const item = { ...data, id: crypto.randomUUID() } as TData;
    this.allData.unshift(item);
    return item;
  }

  async update(id: string | number, data: Partial<TData>): Promise<TData> {
    const idx = this.allData.findIndex((d: any) => d.id === id);
    if (idx === -1) throw new Error('Not found');
    this.allData[idx] = { ...this.allData[idx], ...data };
    return this.allData[idx];
  }

  async delete(id: string | number): Promise<boolean> {
    this.allData = this.allData.filter((d: any) => d.id !== id);
    return true;
  }

  async bulkDelete(ids: (string | number)[]): Promise<boolean> {
    this.allData = this.allData.filter((d: any) => !ids.includes(d.id));
    return true;
  }

  async reorder(ids: (string | number)[]): Promise<boolean> {
    const reordered = ids.map((id) => this.allData.find((d: any) => d.id === id)).filter(Boolean);
    const remaining = this.allData.filter((d: any) => !ids.includes(d.id));
    this.allData = [...reordered, ...remaining];
    return true;
  }
}

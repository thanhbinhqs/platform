// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// Store — Zustand state + React Context provider
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, createElement, type ReactNode } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type { GridState, SortModel, FilterModel, IDataSource, GridPlugin, GridEventType, GridFeatures, GridThemeTokens } from './types';
import { GridEventBus } from './event-bus';
import { defaultTheme } from './theme';

// ─── Grid Store Interface ───────────────────────────────────────
export interface GridStore<TData> {
  // State
  state: GridState<TData>;
  // Actions
  setData: (data: TData[], total: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSorts: (sorts: SortModel[]) => void;
  setFilters: (filters: FilterModel[]) => void;
  setGlobalSearch: (search: string) => void;
  setDensity: (density: 'compact' | 'standard' | 'comfortable') => void;
  setColumnVisibility: (vis: Record<string, boolean>) => void;
  setColumnPinning: (pin: Record<string, 'left' | 'right' | false>) => void;
  toggleRowSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  // Internals
  dataSource: IDataSource<TData> | null;
  setDataSource: (ds: IDataSource<TData>) => void;
  eventBus: GridEventBus;
  plugins: GridPlugin<TData>[];
  setPlugins: (plugins: GridPlugin<TData>[]) => void;
  features: GridFeatures;
  theme: GridThemeTokens;
}

export function createGridStore<TData>(initial?: Partial<GridState<TData>>) {
  return createStore<GridStore<TData>>((set, get) => ({
    state: {
      data: [],
      total: 0,
      loading: false,
      error: null,
      page: 1,
      pageSize: 20,
      totalPages: 0,
      sorts: [],
      filters: [],
      globalSearch: '',
      selectedRows: {},
      columnVisibility: {},
      columnPinning: {},
      density: 'standard',
      ...initial,
    },
    dataSource: null,
    eventBus: new GridEventBus(),
    plugins: [],
    features: {},
    theme: defaultTheme,

    setData: (data, total) => set((s) => ({ state: { ...s.state, data, total } })),
    setLoading: (loading) => set((s) => ({ state: { ...s.state, loading } })),
    setError: (error) => set((s) => ({ state: { ...s.state, error } })),
    setPage: (page) => set((s) => ({ state: { ...s.state, page } })),
    setPageSize: (pageSize) => set((s) => ({ state: { ...s.state, pageSize } })),
    setSorts: (sorts) => set((s) => ({ state: { ...s.state, sorts } })),
    setFilters: (filters) => set((s) => ({ state: { ...s.state, filters } })),
    setGlobalSearch: (globalSearch) => set((s) => ({ state: { ...s.state, globalSearch } })),
    setDensity: (density) => set((s) => ({ state: { ...s.state, density } })),
    setColumnVisibility: (columnVisibility) => set((s) => ({ state: { ...s.state, columnVisibility } })),
    setColumnPinning: (columnPinning) => set((s) => ({ state: { ...s.state, columnPinning } })),
    toggleRowSelection: (id) => set((s) => {
      const sel = { ...s.state.selectedRows };
      if (sel[id]) delete sel[id]; else sel[id] = true;
      return { state: { ...s.state, selectedRows: sel } };
    }),
    selectAll: (ids) => set((s) => {
      const sel: Record<string, boolean> = {};
      ids.forEach((id) => { sel[id] = true; });
      return { state: { ...s.state, selectedRows: sel } };
    }),
    clearSelection: () => set((s) => ({ state: { ...s.state, selectedRows: {} } })),
    setDataSource: (dataSource) => set({ dataSource }),
    setPlugins: (plugins) => set({ plugins }),
  }));
}

export type GridStoreApi = ReturnType<typeof createGridStore>;

// ─── React Context ──────────────────────────────────────────────
const GridContext = createContext<any>(null);

export function GridProvider<TData>({
  children,
  store,
}: {
  children: ReactNode;
  store: GridStoreApi;
}) {
  return createElement(GridContext.Provider, { value: store }, children);
}

export function useGridStore<TData>(): GridStore<TData> {
  const store = useContext(GridContext);
  if (!store) throw new Error('useGridStore must be used within GridProvider');
  return useStore(store);
}

export function useGridSelector<TData, T>(selector: (state: GridStore<TData>) => T): T {
  const store = useContext(GridContext);
  if (!store) throw new Error('useGridSelector must be used within GridProvider');
  return useStore(store, selector);
}

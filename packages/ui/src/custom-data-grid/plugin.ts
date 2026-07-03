// ═══════════════════════════════════════════════════════════════
// Plugin System — Pluggable feature modules
// ═══════════════════════════════════════════════════════════════

import type { GridPlugin, GridPluginContext, GridPluginHooks, GridRequest, GridResponse, IDataSource, GridEvent } from './types';

export function mergePluginHooks<TData>(plugins: GridPlugin<TData>[]): Partial<GridPluginHooks<TData>> {
  const merged: Partial<GridPluginHooks<TData>> = {};

  const merge = <K extends keyof GridPluginHooks<TData>>(key: K) => {
    const fns = plugins.map((p) => p.hooks?.[key]).filter(Boolean) as NonNullable<GridPluginHooks<TData>[K]>[];
    if (fns.length === 0) return;
    merged[key] = ((...args: any[]) => {
      let result: any = args[0];
      for (const fn of fns) {
        if (key === 'beforeLoad') { result = (fn as any)(result); }
        else if (key === 'afterLoad') { result = (fn as any)(result); }
        else if (key === 'beforeRender') { result = (fn as any)(result); }
        else if (key === 'onEvent') { (fn as any)(...args); }
        else if (key === 'rowClassName') { const cls = (fn as any)(...args); if (cls) return cls; }
      }
      return result;
    }) as any;
  };

  merge('beforeLoad');
  merge('afterLoad');
  merge('beforeRender');
  merge('onEvent');
  merge('rowClassName');

  return merged;
}

// ─── Built-in: Selection Plugin ──────────────────────────────────
export function SelectionPlugin<TData>(): GridPlugin<TData> {
  return {
    name: 'selection',
    version: '1.0.0',
    hooks: {
      rowClassName: (row: any) => row._selected ? 'bg-primary/5' : undefined,
    },
  };
}

// ─── Built-in: Export Plugin ─────────────────────────────────────
export function ExportPlugin<TData>(options?: { filename?: string }): GridPlugin<TData> {
  return {
    name: 'export',
    version: '1.0.0',
  };
}

// ─── Built-in: Scanner Plugin ────────────────────────────────────
export function ScannerPlugin<TData>(options?: { onScan?: (code: string) => void }): GridPlugin<TData> {
  let buffer = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    name: 'scanner',
    version: '1.0.0',
    hooks: {
      onEvent: (event: GridEvent) => {
        if (event.type === 'ScannerDetected' && options?.onScan) {
          options.onScan(event.payload as string);
        }
      },
    },
    onInit(ctx: GridPluginContext<TData>) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && buffer.length > 3) {
          ctx.dispatch({ type: 'ScannerDetected' as any, payload: buffer, timestamp: Date.now() });
          if (options?.onScan) options.onScan(buffer);
          buffer = '';
          return;
        }
        if (e.key.length === 1) buffer += e.key;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { buffer = ''; }, 200);
      };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    },
  };
}

// ─── Built-in: Realtime Plugin ───────────────────────────────────
export function RealtimePlugin<TData>(options?: { onUpdate?: (data: TData) => void }): GridPlugin<TData> {
  return {
    name: 'realtime',
    version: '1.0.0',
    hooks: {
      onEvent: (event: GridEvent) => {
        if (event.type === 'RealtimeUpdated' && options?.onUpdate) {
          options.onUpdate(event.payload as TData);
        }
      },
    },
  };
}

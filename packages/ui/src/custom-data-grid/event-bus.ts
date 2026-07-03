// ═══════════════════════════════════════════════════════════════
// Event Bus — Enterprise event system for grid communication
// ═══════════════════════════════════════════════════════════════

import type { GridEvent, GridEventType } from './types';

type Listener = (event: GridEvent) => void;

export class GridEventBus {
  private listeners = new Map<string, Set<Listener>>();
  private history: GridEvent[] = [];
  private maxHistory = 500;

  on(type: GridEventType, listener: Listener): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  emit(type: GridEventType, payload: unknown): void {
    const event: GridEvent = { type, payload, timestamp: Date.now() };
    this.history.push(event);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.listeners.get(type)?.forEach((fn) => fn(event));
    // Also emit wildcard '*'
    this.listeners.get('*' as any)?.forEach((fn) => fn(event));
  }

  getHistory(): GridEvent[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  destroy(): void {
    this.listeners.clear();
    this.history = [];
  }
}

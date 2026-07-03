// Context Menu — Right-click floating menu with RBAC

import { useRef, useEffect, useState, type ReactNode } from 'react';
import type { ContextMenuItem } from '../types';

interface Props {
  items: ContextMenuItem[];
  row: Record<string, unknown> | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onAction: (action: string, row: Record<string, unknown>) => void;
}

export function ContextMenu({ items, row, position, onClose, onAction }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [subMenu, setSubMenu] = useState<{ items: ContextMenuItem[]; x: number; y: number } | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
        setSubMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!position || !row) return null;

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 9999,
  };

  return (
    <div ref={ref} style={menuStyle}
      className="min-w-[180px] rounded-lg border bg-card py-1 shadow-xl"
      role="menu">
      {items.map((item, i) => {
        const disabled = typeof item.disabled === 'function' ? item.disabled(row) : item.disabled;
        return (
          <div key={i}>
            {item.divider && <div className="my-1 border-t" />}
            <button
              role="menuitem"
              disabled={disabled}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-accent'
              }`}
              onClick={() => {
                if (item.children) {
                  setSubMenu({ items: item.children, x: 180, y: 0 });
                } else {
                  onAction(item.action, row);
                  onClose();
                }
              }}
              onMouseEnter={() => {
                if (item.children && ref.current) {
                  const rect = ref.current.getBoundingClientRect();
                  setSubMenu({ items: item.children!, x: rect.width, y: 0 });
                }
              }}
            >
              {item.icon && <span className="text-base">{item.icon}</span>}
              {item.label}
            </button>
          </div>
        );
      })}
      {subMenu && (
        <div style={{ position: 'absolute', left: subMenu.x, top: subMenu.y }}>
          <ContextMenu items={subMenu.items} row={row} position={{ x: 0, y: 0 }} onClose={onClose} onAction={onAction} />
        </div>
      )}
    </div>
  );
}

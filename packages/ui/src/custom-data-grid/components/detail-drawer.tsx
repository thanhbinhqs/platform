// @ts-nocheck
// Detail Drawer — Master-detail slide-out panel

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number;
}

export function DetailDrawer({ isOpen, onClose, title, children, width = 480 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Drawer */}
      <div ref={ref}
        className="fixed right-0 top-0 z-50 h-full border-l bg-card shadow-xl transition-all"
        style={{ width: `${width}px` }}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">{title || 'Details'}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-4" style={{ height: 'calc(100% - 52px)' }}>
          {children}
        </div>
      </div>
    </>
  );
}

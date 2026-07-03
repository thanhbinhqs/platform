import { useToastStore } from '@platform/hooks';
import type { ToastType } from '@platform/hooks';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

const iconMap: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const styleMap: Record<ToastType, string> = {
  success: 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200',
  error: 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200',
  info: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200',
  warning: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-in slide-in-from-right-2 flex items-start gap-3 rounded-lg border-l-4 p-4 shadow-lg transition-all ${styleMap[t.type]}`}
          role="alert"
        >
          <span className="mt-0.5 text-lg font-bold">{iconMap[t.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && (
              <p className="text-xs opacity-80 mt-0.5">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

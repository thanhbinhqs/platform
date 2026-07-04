import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  message: string;
  read: boolean;
  time: string;
  link?: string;
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: '1', message: 'New user registered', read: false, time: '2m ago', link: '/users' },
  { id: '2', message: 'Order #1234 shipped', read: false, time: '15m ago', link: '/orders' },
  { id: '3', message: 'Workflow "Inspection" completed', read: true, time: '1h ago', link: '/workflows' },
  { id: '4', message: '3 items low on stock', read: true, time: '3h ago', link: '/products' },
];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications] = useState(SAMPLE_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 transition-colors hover:bg-accent"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-card shadow-xl z-50">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <span className="text-xs text-muted-foreground">{unread} unread</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-accent ${
                    !n.read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => { if (n.link) navigate(n.link); setOpen(false); }}
                >
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{n.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.time}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="border-t px-4 py-2 text-center">
            <button className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { navigate('/notifications'); setOpen(false); }}>
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

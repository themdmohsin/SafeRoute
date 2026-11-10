import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

interface NotificationItem { id: string; kind: 'status' | 'alert'; text: string; at: string; unread: boolean }

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');

  const load = () => apiRequest<{ items: NotificationItem[]; unreadCount: number }>('/notifications')
    .then((r) => { setItems(r.items); setUnread(r.unreadCount); setError(''); })
    .catch((e) => setError(e instanceof Error ? e.message : 'Could not load notifications.'));

  useEffect(() => { load(); }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // Opening the panel marks everything read; dots stay visible until it closes.
      await apiRequest('/notifications/read', { method: 'POST' }).catch(() => undefined);
      setUnread(0);
    }
    if (!next) setItems((list) => list.map((i) => ({ ...i, unread: false })));
  };

  return (
    <div className="relative">
      <button
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={toggle}
        className="relative w-11 h-11 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[22px]">{unread ? 'notifications_active' : 'notifications'}</span>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 max-w-[90vw] rounded-2xl bg-surface-container-lowest shadow-xl border border-outline-variant/20 p-2">
          <p className="px-2 py-1 text-sm font-bold text-primary">Notifications</p>
          {error && <p className="px-2 py-1 text-xs text-error">{error}</p>}
          {!error && !items.length && <p className="px-2 py-3 text-sm text-secondary">Nothing new. Updates on your reports and new high-severity hazards show up here.</p>}
          <ul className="max-h-80 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex gap-2 rounded-xl px-2 py-2 hover:bg-surface-container-low">
                <span className={`material-symbols-outlined text-[18px] ${item.kind === 'alert' ? 'text-error' : 'text-emerald-700'}`}>
                  {item.kind === 'alert' ? 'warning' : 'task_alt'}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-on-surface">{item.text}</p>
                  <time className="text-[11px] text-secondary" dateTime={item.at}>{new Date(item.at).toLocaleString()}</time>
                </div>
                {item.unread && <span className="ml-auto mt-1 w-2 h-2 shrink-0 rounded-full bg-primary" aria-label="unread" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

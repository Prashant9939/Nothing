import { useCallback, useEffect, useRef, useState } from 'react';
import { announcementApi } from '../api';
import type { Announcement } from '../api';
import { BellIcon, CheckCheckIcon } from '@animateicons/react/lucide';

const formatTime = (iso: string) => {
  const d = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(iso)
    ? new Date(`${iso.replace(' ', 'T')}Z`)
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

export default function AnnouncementBell() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await announcementApi.list();
      setItems(res.data.announcements);
      setLoadError('');
    } catch {
      setLoadError('Could not load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = items.filter((a) => !a.read).length;

  const openItem = async (announcement: Announcement) => {
    if (announcement.read) return;
    setItems((prev) => prev.map((a) => (a.id === announcement.id ? { ...a, read: true } : a)));
    try {
      await announcementApi.markRead(announcement.id);
    } catch {
      load();
    }
  };

  const markAll = async () => {
    setItems((prev) => prev.map((a) => ({ ...a, read: true })));
    try {
      await announcementApi.markAllRead();
    } catch {
      load();
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Announcements"
        aria-label={`Announcements${unread > 0 ? `, ${unread} unread` : ''}`}
        className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
      >
        <BellIcon size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[320px] max-w-[calc(100vw-6rem)] sm:w-[360px] bg-white rounded-2xl border border-gray-200 shadow-[0_12px_40px_rgba(0,0,0,0.15)] overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 bg-gray-50/70">
            <div>
              <p className="text-sm font-semibold text-gray-900">Announcements</p>
              <p className="text-[11px] text-gray-500">{unread > 0 ? `${unread} unread` : 'You are all caught up'}</p>
            </div>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
              >
                <CheckCheckIcon size={13} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto overscroll-contain divide-y divide-gray-100">
            {loading && (
              <div className="p-6 flex justify-center">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
              </div>
            )}

            {!loading && loadError && (
              <p className="p-5 text-sm text-red-500 text-center">{loadError}</p>
            )}

            {!loading && !loadError && items.length === 0 && (
              <p className="p-6 text-sm text-gray-500 text-center">No announcements yet.</p>
            )}

            {!loading && !loadError && items.map((a) => (
              <button
                key={a.id}
                onClick={() => openItem(a)}
                className={`w-full text-left p-4 flex gap-3 transition-colors ${
                  a.read ? 'hover:bg-gray-50' : 'bg-orange-50/50 hover:bg-orange-50'
                }`}
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${a.read ? 'bg-gray-200' : 'bg-orange-500'}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm truncate ${a.read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                      {a.title}
                    </span>
                    <span className="text-[10px] text-gray-500 shrink-0">{formatTime(a.createdAt)}</span>
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5 whitespace-pre-line line-clamp-3">{a.message}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

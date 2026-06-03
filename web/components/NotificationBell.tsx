'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications, NOTIF_META, Notification } from './NotificationContext';

// time

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// single notification item

function NotifItem({ notif, onRead }: { notif: Notification; onRead: (id: string) => void }) {
  const meta = NOTIF_META[notif.type];
  return (
    <div
      onClick={() => onRead(notif.id)}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-surface/60
        ${notif.read ? 'opacity-60' : 'bg-surface/30'}`}
    >
      {/* icon */}
      <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center shrink-0 mt-0.5 text-sm`}>
        {meta.emoji}
      </div>

      {/* content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold leading-snug ${notif.read ? 'text-textMuted' : 'text-textLight'}`}>
            {notif.title}
          </p>
          {!notif.read && (
            <div className="w-2 h-2 rounded-full bg-mint shrink-0 mt-1" />
          )}
        </div>
        <p className="text-xs text-textMuted leading-relaxed mt-0.5 line-clamp-2">
          {notif.message}
        </p>
        <p className="text-[10px] text-textMuted/60 mt-1">{timeAgo(notif.timestamp)}</p>
      </div>
    </div>
  );
}

// bell component

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-xl border border-borderLine bg-card hover:bg-surface transition flex items-center justify-center"
      >
        {/* bell svg */}
        <svg className="w-4 h-4 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* red badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-card border border-borderLine rounded-2xl shadow-2xl z-50 overflow-hidden">

          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-borderLine">
            <div className="flex items-center gap-2">
              <p className="text-textLight text-sm font-bold">Notifications</p>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-mint hover:opacity-70 transition font-semibold"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[10px] text-textMuted hover:text-red-400 transition font-semibold"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* list */}
          <div className="max-h-96 overflow-y-auto divide-y divide-borderLine">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <span className="text-2xl">🔔</span>
                <p className="text-textMuted text-xs">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <NotifItem key={n.id} notif={n} onRead={markRead} />
              ))
            )}
          </div>

          {/* footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-borderLine text-center">
              <p className="text-[10px] text-textMuted">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''} total
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
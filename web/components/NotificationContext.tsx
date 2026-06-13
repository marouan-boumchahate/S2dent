'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { getAccessToken } from '@/lib/api'; // Integrated your global auth state resolver

// Types

export type NotificationType =
  | 'wallet_connected'
  | 'identity_issued'
  | 'identity_revoked'
  | 'student_registered'
  | 'professor_registered'
  | 'credential_issued'
  | 'credential_revoked'
  | 'system';

export interface Notification {
  id: string;               // local UI id
  eventId?: string;         // server eventId — used for ACK
  type: NotificationType;
  title: string;
  message: string;
  txHash?: string;          // from socket payload
  status?: 'verified' | 'failed';
  timestamp: Date;
  read: boolean;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clearAll: () => void;
  push: (n: Omit<Notification, 'id' | 'timestamp' | 'read'> & { timestamp?: Date }) => void;
}

// Context

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}

// Icon & color helpers

export const NOTIF_META: Record<NotificationType, { emoji: string; color: string; bg: string }> = {
  wallet_connected:     { emoji: '🔗', color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  identity_issued:      { emoji: '✅', color: 'text-mint',        bg: 'bg-mint/10'        },
  identity_revoked:     { emoji: '🚫', color: 'text-red-400',     bg: 'bg-red-400/10'    },
  student_registered:   { emoji: '🎓', color: 'text-purple-400',  bg: 'bg-purple-400/10' },
  professor_registered: { emoji: '👨‍🏫', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  credential_issued:    { emoji: '📜', color: 'text-cyan-400',    bg: 'bg-cyan-400/10'   },
  credential_revoked:   { emoji: '⚠️', color: 'text-yellow-400',  bg: 'bg-yellow-400/10' },
  system:               { emoji: '🔔', color: 'text-textMuted',   bg: 'bg-surface'       },
};

// Parse server message into a notification type & title
// The server sends a plain `message` string — we derive type & title from it

function parseSocketEvent(data: {
  eventId: string;
  tx_hash: string;
  status: 'verified' | 'failed';
  message: string;
  created_at: string;
}): Omit<Notification, 'id' | 'timestamp' | 'read'> & { timestamp?: Date } {
  const msg = data.message.toLowerCase();

  let type: NotificationType = 'system';
  let title = 'Notification';

  if (data.status === 'failed') {
    type = 'system';
    title = 'Transaction failed';
  } else if (msg.includes('identity') && msg.includes('issued')) {
    type = 'identity_issued';
    title = 'Identity issued';
  } else if (msg.includes('identity') && msg.includes('revoked')) {
    type = 'identity_revoked';
    title = 'Identity revoked';
  } else if (msg.includes('credential') && msg.includes('issued')) {
    type = 'credential_issued';
    title = 'Credential issued';
  } else if (msg.includes('credential') && msg.includes('revoked')) {
    type = 'credential_revoked';
    title = 'Credential revoked';
  } else if (msg.includes('wallet')) {
    type = 'wallet_connected';
    title = 'Wallet connected';
  } else if (msg.includes('student')) {
    type = 'student_registered';
    title = 'Student registered';
  } else if (msg.includes('professor')) {
    type = 'professor_registered';
    title = 'Professor registered';
  }

  let parsedTimestamp: Date | undefined = undefined;
  if (data.created_at) {
    const d = new Date(data.created_at);
    if (!isNaN(d.getTime())) {
      parsedTimestamp = d;
    }
  }

  return {
    eventId: data.eventId,
    type,
    title,
    message: data.message,
    txHash: data.tx_hash,
    status: data.status,
    timestamp: parsedTimestamp,
  };
}

// Socket hook

function useSocket(onEvent: (n: Omit<Notification, 'id' | 'timestamp' | 'read'> & { timestamp?: Date }) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
    const token = getAccessToken(); // Safely pulls the real 'access_token' parameter string from storage

    if (!SOCKET_URL) return;

    // REAL SOCKET (active when NEXT_PUBLIC_SOCKET_URL is set)
    let socket: ReturnType<typeof import('socket.io-client').io> | null = null;

    import('socket.io-client').then(({ io }) => {
      socket = io(SOCKET_URL, { transports: ['websocket'] });

      // Step 1: on connect → authenticate with JWT
      socket.on('connect', () => {
        if (token && token !== 'undefined' && token !== 'null') {
          socket!.emit('join', token);
        } else {
          console.error('Cannot connect to socket: Access token is missing or undefined.');
        }
      });

      // Step 2: listen for notifications
      socket.on('notification', (data: {
        eventId: string;
        tx_hash: string;
        status: 'verified' | 'failed';
        message: string;
        created_at: string;
      }) => {
        const parsed = parseSocketEvent(data);
        onEventRef.current(parsed);

        // Step 3: ACK every event so server doesn't re-send it
        if (data.eventId) {
          socket!.emit('ack_event', data.eventId);
        }
      });

      socket.on('disconnect', () => {
        console.log('[S2dent] Socket disconnected');
      });
    });

    return () => {
      socket?.disconnect();
    };
  }, []);
}

// Provider

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const push = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'> & { timestamp?: Date }) => {
    setNotifications(prev => [
      { ...n, id: crypto.randomUUID(), timestamp: n.timestamp || new Date(), read: false },
      ...prev,
    ].slice(0, 50));
  }, []);

  useSocket(push);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, clearAll, push }}>
      {children}
    </NotificationContext.Provider>
  );
}
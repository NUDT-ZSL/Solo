import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Objective, WsMessage, UserInfo } from '../types';

interface WebSocketContextType {
  okrs: Objective[];
  onlineUsers: UserInfo[];
  currentUserId: string;
  currentUserColor: string;
  sendMessage: (type: string, data?: unknown) => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within WebSocketProvider');
  return ctx;
};

const USER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [okrs, setOkrs] = useState<Objective[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const currentUserIdRef = useRef<string>('');
  const currentUserColorRef = useRef<string>(USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);

  const connect = useCallback(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        switch (msg.type) {
          case 'okr:list':
            setOkrs(msg.data as Objective[]);
            break;
          case 'okr:created':
            setOkrs(prev => [...prev, msg.data as Objective]);
            break;
          case 'okr:updated': {
            const updated = msg.data as Objective;
            setOkrs(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
            break;
          }
          case 'okr:deleted': {
            const { id } = msg.data as { id: string };
            setOkrs(prev => prev.filter(o => o.id !== id));
            break;
          }
          case 'okr:locked': {
            const { objectiveId, userId, color } = msg.data as { objectiveId: string; userId: string; color: string };
            setOkrs(prev => prev.map(o => o.id === objectiveId ? { ...o, lockedBy: userId, lockColor: color } : o));
            break;
          }
          case 'okr:unlocked': {
            const { objectiveId } = msg.data as { objectiveId: string };
            setOkrs(prev => prev.map(o => o.id === objectiveId ? { ...o, lockedBy: undefined, lockColor: undefined } : o));
            break;
          }
          case 'users:online': {
            const users = msg.data as UserInfo[];
            setOnlineUsers(users);
            const self = users.find(u => u.color === currentUserColorRef.current && !currentUserIdRef.current);
            if (self) {
              currentUserIdRef.current = self.id;
            }
            break;
          }
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      reconnectTimerRef.current = window.setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const sendMessage = useCallback((type: string, data?: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{
      okrs,
      onlineUsers,
      currentUserId: currentUserIdRef.current,
      currentUserColor: currentUserColorRef.current,
      sendMessage,
      isConnected
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

import { useEffect, useRef, useCallback, useState } from 'react';

export interface Card {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  content: string;
  color: string;
  sentiment: number;
  createdAt: number;
}

export interface Connection {
  id: string;
  fromCardId: string;
  toCardId: string;
  createdAt: number;
}

export interface UserInfo {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface BoardState {
  cards: Record<string, Card>;
  connections: Record<string, Connection>;
}

export interface UseWebSocketReturn {
  state: BoardState;
  users: UserInfo[];
  currentUserId: string | null;
  connected: boolean;
  send: (type: string, payload?: any) => void;
  autoLayoutTrigger: number;
}

export function useWebSocket(): UseWebSocketReturn {
  const [state, setState] = useState<BoardState>({ cards: {}, connections: {} });
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [autoLayoutTrigger, setAutoLayoutTrigger] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:3003`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'init':
            setCurrentUserId(msg.payload.userId);
            setState(msg.payload.state);
            setUsers(msg.payload.users || []);
            break;
          case 'state':
            setState(msg.payload);
            if (msg.users) setUsers(msg.users);
            break;
          case 'userJoin':
            setUsers((prev) => {
              if (prev.find((u) => u.id === msg.payload.id)) return prev;
              return [...prev, msg.payload];
            });
            break;
          case 'userLeave':
            setUsers((prev) => prev.filter((u) => u.id !== msg.payload.id));
            break;
          case 'autoLayoutStart':
            setAutoLayoutTrigger((n) => n + 1);
            break;
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
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

  const send = useCallback((type: string, payload?: any) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({ type, payload });
      if (msg.length <= 50 * 1024) {
        ws.send(msg);
      } else {
        console.warn('Message too large, skipped');
      }
    }
  }, []);

  return { state, users, currentUserId, connected, send, autoLayoutTrigger };
}

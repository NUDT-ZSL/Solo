import { useRef, useCallback, useEffect, useState } from 'react';
import { NoteEvent, User, InstrumentType } from '../types';

interface UseWebSocketProps {
  roomId: string;
  userId: string;
  onNoteReceived?: (event: NoteEvent) => void;
  onUserJoined?: (user: User) => void;
  onUserLeft?: (userId: string) => void;
  onUsersUpdate?: (users: User[]) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendNote: (event: NoteEvent) => void;
  users: User[];
}

const useWebSocket = ({
  roomId,
  userId,
  onNoteReceived,
  onUserJoined,
  onUserLeft,
  onUsersUpdate,
}: UseWebSocketProps): UseWebSocketReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    const isDev = import.meta.env.DEV;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isDev ? 'localhost:3001' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws?roomId=${roomId}&userId=${userId}`;

    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'note':
              if (data.userId !== userId && onNoteReceived) {
                onNoteReceived(data);
              }
              break;
            case 'userJoined':
              setUsers((prev) => {
                if (prev.find((u) => u.id === data.user.id)) return prev;
                const newUsers = [...prev, data.user];
                onUsersUpdate?.(newUsers);
                return newUsers;
              });
              if (data.user.id !== userId) {
                onUserJoined?.(data.user);
              }
              break;
            case 'userLeft':
              setUsers((prev) => {
                const newUsers = prev.filter((u) => u.id !== data.userId);
                onUsersUpdate?.(newUsers);
                return newUsers;
              });
              if (data.userId !== userId) {
                onUserLeft?.(data.userId);
              }
              break;
            case 'users':
              setUsers(data.users || []);
              onUsersUpdate?.(data.users || []);
              break;
            default:
              break;
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Closed:', event.code, event.reason);
        setIsConnected(false);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocket] Reconnecting...');
          connect();
        }, 2000);
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [roomId, userId, onNoteReceived, onUserJoined, onUserLeft, onUsersUpdate]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendNote = useCallback((event: NoteEvent) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'note', ...event }));
    }
  }, []);

  const sendUserInfo = useCallback(
    (userName: string, instrument: InstrumentType) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'userInfo',
            user: { id: userId, name: userName, instrument },
          })
        );
      }
    },
    [userId]
  );

  return {
    isConnected,
    sendNote,
    users,
  };
};

export default useWebSocket;

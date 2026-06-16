import { useRef, useEffect, useCallback, useState } from 'react';
import type {
  ClientMessage,
  ServerMessage,
  TextOperation,
  CursorPosition,
  UserInfo,
  StudentMetrics,
} from '../types';

interface UseWebSocketOptions {
  roomId: string;
  userId: string;
  username: string;
  role: 'student' | 'teacher';
  onMessage?: (message: ServerMessage) => void;
}

interface InternalUser {
  id: string;
  username: string;
  role: string;
  color: string;
  connectedAt?: number;
}

interface UseWebSocketReturn {
  sendMessage: (message: ClientMessage) => void;
  isConnected: boolean;
  lastError: Event | null;
  users: InternalUser[];
  document: string;
  remoteCursors: Map<string, CursorPosition>;
  studentMetrics: StudentMetrics[];
  sendOp: (roomId: string, op: TextOperation & { userId?: string; index?: number }) => void;
  sendCursor: (roomId: string, cursor: CursorPosition & { userId?: string }) => void;
  joinRoom: (roomId: string, user: InternalUser) => void;
  leaveRoom: (roomId: string, userId: string) => void;
  setDocument: (doc: string) => void;
}

export function useWebSocket(options?: UseWebSocketOptions): UseWebSocketReturn {
  const roomId = options?.roomId || '';
  const userId = options?.userId || '';
  const username = options?.username || '';
  const role = options?.role || 'student';
  const onMessage = options?.onMessage;

  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<Event | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCloseRef = useRef(false);

  const [users, setUsers] = useState<InternalUser[]>([]);
  const [document, setDocumentState] = useState<string>('');
  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [studentMetrics, setStudentMetrics] = useState<StudentMetrics[]>([]);

  const userInfoToInternal = (user: UserInfo): InternalUser => ({
    id: user.userId,
    username: user.username,
    role: user.role,
    color: user.color,
    connectedAt: user.connectedAt,
  });

  const internalToUserInfo = (user: InternalUser): UserInfo => ({
    userId: user.id,
    username: user.username,
    role: user.role === 'teacher' ? 'teacher' : 'student',
    color: user.color,
    connectedAt: user.connectedAt || Date.now(),
  });

  const connect = useCallback(() => {
    if (!roomId || !userId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const port = 3001;
    const wsUrl = `${protocol}//${host}:${port}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setLastError(null);
      const joinMessage: ClientMessage = {
        type: 'join',
        roomId,
        userId,
        username,
        role,
      };
      ws.send(JSON.stringify(joinMessage));
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      if (!manualCloseRef.current) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
      void event;
    };

    ws.onerror = (event) => {
      setLastError(event);
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'init':
            setUsers(message.users.map(userInfoToInternal));
            setDocumentState(message.document);
            setStudentMetrics(message.studentMetrics);
            break;
          case 'op': {
            const op = message.operation;
            setDocumentState((prevDoc) => {
              if (op.type === 'insert') {
                const pos = op.position;
                return prevDoc.slice(0, pos) + (op.text || '') + prevDoc.slice(pos);
              } else if (op.type === 'delete') {
                const pos = op.position;
                const len = op.length || 0;
                return prevDoc.slice(0, pos) + prevDoc.slice(pos + len);
              }
              return prevDoc;
            });
            break;
          }
          case 'cursor': {
            const { userId: cursorUserId, cursorPosition } = message;
            setRemoteCursors((prev) => {
              const next = new Map(prev);
              next.set(cursorUserId, cursorPosition);
              return next;
            });
            break;
          }
          case 'userJoin':
            setUsers((prev) => {
              const internal = userInfoToInternal(message.user);
              if (prev.find((u) => u.id === internal.id)) return prev;
              return [...prev, internal];
            });
            break;
          case 'userLeave':
            setUsers((prev) => prev.filter((u) => u.id !== message.userId));
            setRemoteCursors((prev) => {
              const next = new Map(prev);
              next.delete(message.userId);
              return next;
            });
            break;
          case 'studentMetrics':
            setStudentMetrics(message.metrics);
            break;
          case 'usersList':
            setUsers(message.users.map(userInfoToInternal));
            break;
        }

        onMessage?.(message);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
  }, [roomId, userId, username, role, onMessage]);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const sendOp = useCallback(
    (
      roomIdParam: string,
      op: TextOperation & { userId?: string; index?: number }
    ) => {
      const position = op.position ?? op.index ?? 0;
      const operation: TextOperation = {
        type: op.type,
        position,
        text: op.text,
        length: op.length,
        timestamp: op.timestamp || Date.now(),
      };
      const message: ClientMessage = {
        type: 'op',
        userId: op.userId || userId,
        roomId: roomIdParam,
        operation,
      };
      sendMessage(message);
    },
    [userId, sendMessage]
  );

  const sendCursor = useCallback(
    (
      roomIdParam: string,
      cursor: CursorPosition & { userId?: string }
    ) => {
      const cursorPosition: CursorPosition = {
        row: cursor.row,
        column: cursor.column,
        position: cursor.position,
      };
      const message: ClientMessage = {
        type: 'cursor',
        userId: cursor.userId || userId,
        roomId: roomIdParam,
        cursorPosition,
      };
      sendMessage(message);
    },
    [userId, sendMessage]
  );

  const joinRoom = useCallback(
    (roomIdParam: string, user: InternalUser) => {
      const userInfo = internalToUserInfo(user);
      const message: ClientMessage = {
        type: 'join',
        userId: user.id,
        username: user.username,
        role: user.role === 'teacher' ? 'teacher' : 'student',
        roomId: roomIdParam,
      };
      setUsers((prev) => {
        if (prev.find((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });
      sendMessage(message);
      void userInfo;
    },
    [sendMessage]
  );

  const leaveRoom = useCallback(
    (roomIdParam: string, userIdParam: string) => {
      const message: ClientMessage = {
        type: 'leave',
        userId: userIdParam,
        roomId: roomIdParam,
      };
      setUsers((prev) => prev.filter((u) => u.id !== userIdParam));
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(userIdParam);
        return next;
      });
      sendMessage(message);
    },
    [sendMessage]
  );

  const setDocument = useCallback((doc: string) => {
    setDocumentState(doc);
  }, []);

  useEffect(() => {
    if (!options) return;

    manualCloseRef.current = false;
    connect();

    return () => {
      manualCloseRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        const leaveMessage: ClientMessage = {
          type: 'leave',
          roomId,
          userId,
        };
        try {
          wsRef.current.send(JSON.stringify(leaveMessage));
        } catch (e) {
          void e;
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, roomId, userId, options]);

  return {
    sendMessage,
    isConnected,
    lastError,
    users,
    document,
    remoteCursors,
    studentMetrics,
    sendOp,
    sendCursor,
    joinRoom,
    leaveRoom,
    setDocument,
  };
}

export type {
  UseWebSocketOptions,
  UseWebSocketReturn,
  InternalUser as User,
};

export type { TextOperation, CursorPosition };

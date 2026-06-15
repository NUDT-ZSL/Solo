import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  userId: string;
  projectId?: string;
  onCardCreated?: (data: unknown) => void;
  onCardUpdated?: (data: unknown) => void;
  onCardDeleted?: (data: unknown) => void;
  onCommentAdded?: (data: unknown) => void;
  onMemberJoined?: (data: unknown) => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const { userId, projectId, onCardCreated, onCardUpdated, onCardDeleted, onCommentAdded, onMemberJoined } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;

      if (projectId && userId) {
        socket.emit('join-project', { projectId, userId });
      }
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      scheduleReconnect();
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      setIsConnected(false);
      scheduleReconnect();
    });

    if (onCardCreated) {
      socket.on('card-created', (data) => {
        onCardCreated(data);
      });
    }

    if (onCardUpdated) {
      socket.on('card-updated', (data) => {
        onCardUpdated(data);
      });
    }

    if (onCardDeleted) {
      socket.on('card-deleted', (data) => {
        onCardDeleted(data);
      });
    }

    if (onCommentAdded) {
      socket.on('comment-added', (data) => {
        onCommentAdded(data);
      });
    }

    if (onMemberJoined) {
      socket.on('member-joined', (data) => {
        onMemberJoined(data);
      });
    }
  }, [projectId, userId, onCardCreated, onCardUpdated, onCardDeleted, onCommentAdded, onMemberJoined]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      connect();
    }, delay);
  }, [connect]);

  const joinProject = useCallback((projectId: string) => {
    if (socketRef.current?.connected && projectId && userId) {
      socketRef.current.emit('join-project', { projectId, userId });
    }
  }, [userId]);

  const leaveProject = useCallback((projectId: string) => {
    if (socketRef.current?.connected && projectId) {
      socketRef.current.emit('leave-project', { projectId });
    }
  }, []);

  useEffect(() => {
    if (projectId && isConnected && userId) {
      joinProject(projectId);
    }
  }, [projectId, isConnected, userId, joinProject]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  return {
    isConnected,
    joinProject,
    leaveProject,
  };
}

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, User } from '../types';

const SOCKET_URL = '';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  const connect = useCallback(() => {
    if (socketRef.current) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('user:assigned', (user: User) => {
      setCurrentUser(user);
    });

    socket.on('users:update', (users: User[]) => {
      setOnlineUsers(users);
    });

    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendEvent = useCallback(<T = unknown>(event: string, data?: T) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const onEvent = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
    };
  }, []);

  const requestInitialCards = useCallback((): Promise<Card[]> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve([]);
        return;
      }
      socketRef.current.emit('cards:request');
      socketRef.current.once('cards:initial', (cards: Card[]) => {
        resolve(cards);
      });
    });
  }, []);

  const addCard = useCallback((card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
    sendEvent('card:add', card);
  }, [sendEvent]);

  const updateCard = useCallback((card: Partial<Card> & { id: string }) => {
    sendEvent('card:update', card);
  }, [sendEvent]);

  const deleteCard = useCallback((id: string) => {
    sendEvent('card:delete', { id });
  }, [sendEvent]);

  const moveCard = useCallback((data: {
    id: string;
    newStatus: Card['status'];
    newOrder: number;
  }) => {
    sendEvent('card:move', data);
  }, [sendEvent]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    currentUser,
    onlineUsers,
    connect,
    disconnect,
    sendEvent,
    onEvent,
    requestInitialCards,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
  };
}

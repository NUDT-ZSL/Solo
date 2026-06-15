import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, CursorPosition } from '@/types';

interface UseSocketReturn {
  isConnected: boolean;
  userColor: string;
  currentContent: string;
  users: User[];
  notifications: { id: number; message: string; type: 'info' | 'warning' }[];
  joinRoom: (roomId: string, userName: string) => void;
  sendEdit: (content: string) => void;
  sendCursorPosition: (position: CursorPosition) => void;
  onEdit: (callback: (content: string) => void) => void;
  getLatestContent: () => string;
  disconnect: () => void;
}

export function useSocket(roomId: string | null, userName: string): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [userColor, setUserColor] = useState('');
  const [currentContent, setCurrentContent] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'info' | 'warning' }[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const editCallbackRef = useRef<((content: string) => void) | null>(null);
  const notificationIdRef = useRef(0);

  const addNotification = useCallback((message: string, type: 'info' | 'warning' = 'info') => {
    const id = ++notificationIdRef.current;
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room-joined', (data: { userId: string; userColor: string; currentContent: string; users: User[] }) => {
      setUserColor(data.userColor);
      setCurrentContent(data.currentContent);
      setUsers(data.users);
      addNotification('已成功加入房间', 'info');
    });

    socket.on('user-joined', (user: User) => {
      setUsers(prev => {
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
      addNotification(`${user.name} 加入了房间`, 'info');
    });

    socket.on('user-left', (data: { userId: string; userName: string }) => {
      setUsers(prev => prev.filter(u => u.id !== data.userId));
      addNotification(`${data.userName} 已离开`, 'warning');
    });

    socket.on('edit-received', (data: { content: string; fromUser: string }) => {
      setCurrentContent(data.content);
      if (editCallbackRef.current) {
        editCallbackRef.current(data.content);
      }
    });

    socket.on('cursor-update', (data: { userId: string; position: CursorPosition }) => {
      setUsers(prev => prev.map(u => 
        u.id === data.userId ? { ...u, cursorPosition: data.position } : u
      ));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, addNotification]);

  const joinRoom = useCallback((rid: string, uname: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', { roomId: rid, userName: uname });
    }
  }, []);

  useEffect(() => {
    if (roomId && userName && socketRef.current && isConnected) {
      joinRoom(roomId, userName);
    }
  }, [roomId, userName, isConnected, joinRoom]);

  const sendEdit = useCallback((content: string) => {
    if (socketRef.current && roomId) {
      setCurrentContent(content);
      socketRef.current.emit('edit', { roomId, content });
    }
  }, [roomId]);

  const sendCursorPosition = useCallback((position: CursorPosition) => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('cursor-move', { roomId, position });
    }
  }, [roomId]);

  const onEdit = useCallback((callback: (content: string) => void) => {
    editCallbackRef.current = callback;
  }, []);

  const getLatestContent = useCallback(() => currentContent, [currentContent]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  return {
    isConnected,
    userColor,
    currentContent,
    users,
    notifications,
    joinRoom,
    sendEdit,
    sendCursorPosition,
    onEdit,
    getLatestContent,
    disconnect
  };
}

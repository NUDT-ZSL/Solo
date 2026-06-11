import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from './UserContext';

interface SocketContextType {
  socket: Socket | null;
  notifications: Notification[];
  addNotification: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { currentUser } = useUser();

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      query: { userId: currentUser.id },
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('exchange_notification', (data: { message: string }) => {
      addNotification(data.message, 'info');
    });

    newSocket.on('exchange_updated', (data: { message: string; status: string }) => {
      const type = data.status === 'accepted' ? 'success' : data.status === 'rejected' ? 'error' : 'info';
      addNotification(data.message, type as 'info' | 'success' | 'error');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [currentUser.id]);

  const addNotification = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, addNotification }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

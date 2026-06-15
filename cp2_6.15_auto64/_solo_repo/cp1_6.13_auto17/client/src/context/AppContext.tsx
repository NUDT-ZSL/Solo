import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { User, AppContextType, Message, ToastItem } from '@/types';

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const savedUserId = localStorage.getItem('skillswap_user');
    if (savedUserId) {
      fetch(`/api/users/${savedUserId}`)
        .then((res) => res.json())
        .then((user: User) => {
          if (user && user._id) {
            setCurrentUser(user);
            fetchUnreadCount(savedUserId);
          } else {
            localStorage.removeItem('skillswap_user');
          }
        })
        .catch(() => {
          localStorage.removeItem('skillswap_user');
        });
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        websocket.send(JSON.stringify({ type: 'auth', userId: currentUser._id }));
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message') {
            const message = data.data as Message;
            if (message.toUserId === currentUser._id && !message.read) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setWs(websocket);

      return () => {
        websocket.close();
      };
    }
  }, [currentUser]);

  const fetchUnreadCount = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/messages/unread/${userId}`);
      const data = await res.json();
      setUnreadCount(data.count || 0);
    } catch (e) {
      console.error('Fetch unread count error:', e);
    }
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const value: AppContextType = {
    currentUser,
    setCurrentUser,
    ws,
    unreadCount,
    setUnreadCount,
    showToast,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item ${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

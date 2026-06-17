import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useRef,
} from 'react';
import { Report } from '../types';
import axiosClient from '../api/axiosClient';

interface Notification {
  id: string;
  message: string;
  userName: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: string, userName: string) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenReportsRef = useRef<Set<string>>(new Set());

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (message: string, userName: string) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const notif: Notification = { id, message, userName };
      setNotifications((prev) => [...prev, notif]);

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 3300);
    },
    []
  );

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = (await axiosClient.get('/reports/poll-latest')) as unknown as {
          hasNew: boolean;
          report?: Report;
        };
        if (res.hasNew && res.report && !seenReportsRef.current.has(res.report.id)) {
          seenReportsRef.current.add(res.report.id);
          const typeLabel = res.report.type === 'daily' ? '今日汇报' : '本周汇报';
          addNotification(
            `${res.report.user?.name || '有人'}刚刚提交了${typeLabel}`,
            res.report.user?.name || ''
          );
        }
      } catch {
      }
    }, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [addNotification]);

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, removeNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

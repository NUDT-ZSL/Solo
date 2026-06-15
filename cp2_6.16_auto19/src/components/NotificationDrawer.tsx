import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../services/api';
import { Notification } from '../types';
import './NotificationDrawer.css';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { user, refreshUnreadCount } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await notificationsAPI.getForUser(user.id);
      setNotifications(data);
    } catch (err) {
      console.error('获取通知失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      refreshUnreadCount();
    } catch (err) {
      console.error('标记已读失败', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      for (const n of unreadNotifications) {
        await notificationsAPI.markAsRead(n.id);
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      refreshUnreadCount();
    } catch (err) {
      console.error('全部标记已读失败', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'match':
        return 'fa-exchange-alt';
      case 'exchange_request':
        return 'fa-paper-plane';
      case 'exchange_status':
        return 'fa-info-circle';
      default:
        return 'fa-bell';
    }
  };

  return (
    <>
      <div
        className={`drawer-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      <div className={`drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>通知</h3>
          {notifications.some(n => !n.read) && (
            <button className="mark-all-btn" onClick={handleMarkAllRead}>
              全部已读
            </button>
          )}
        </div>

        <div className="drawer-content">
          {loading ? (
            <div className="drawer-loading">
              <i className="fas fa-spinner fa-spin"></i>
              <span>加载中...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="drawer-empty">
              <i className="fas fa-inbox"></i>
              <p>暂无通知</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                >
                  <div className={`notification-icon ${notification.type}`}>
                    <i className={`fas ${getIcon(notification.type)}`}></i>
                  </div>
                  <div className="notification-body">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-content">{notification.content}</div>
                    <div className="notification-time">
                      {formatTime(notification.createdAt)}
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="unread-dot"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
}

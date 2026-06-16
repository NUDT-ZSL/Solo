import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import type { Notification } from '../types';
import './NotificationToast.css';

const NotificationToast: React.FC = () => {
  const { member } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);

  useEffect(() => {
    if (!member) return;

    const fetchNotifications = async () => {
      try {
        const res = await notificationsAPI.getByMemberId(member.id);
        setNotifications(res.data);

        const unread = res.data.filter((n) => !n.read);
        if (unread.length > 0) {
          setToast(unread[0]);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [member]);

  useEffect(() => {
    const checkReminders = () => {
      // 模拟配送前一天提醒
    };

    checkReminders();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return '🔔';
      case 'status':
        return '📦';
      default:
        return '📢';
    }
  };

  return (
    <>
      <div className="notification-bell" onClick={() => setShowPanel(!showPanel)}>
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </div>

      {showPanel && (
        <div className="notification-panel">
          <div className="panel-header">
            <h3>通知</h3>
            {unreadCount > 0 && (
              <span className="unread-count">{unreadCount} 条未读</span>
            )}
          </div>
          <div className="panel-content">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                  onClick={() => handleMarkRead(notif.id)}
                >
                  <span className="notif-icon">{getNotificationIcon(notif.type)}</span>
                  <div className="notif-content">
                    <div className="notif-title">{notif.title}</div>
                    <div className="notif-message">{notif.message}</div>
                    <div className="notif-time">
                      {new Date(notif.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-notifs">暂无通知</div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className="toast" onClick={() => setToast(null)}>
            <span className="toast-icon">{getNotificationIcon(toast.type)}</span>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-message">{toast.message}</div>
            </div>
            <button className="toast-close" onClick={() => setToast(null)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationToast;

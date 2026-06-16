import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

export default function NotificationBell() {
  const notifications = useStore((state) => state.notifications);
  const getUnreadCount = useStore((state) => state.getUnreadCount);
  const markNotificationRead = useStore((state) => state.markNotificationRead);
  const deleteNotification = useStore((state) => state.deleteNotification);
  const markAllNotificationsRead = useStore((state) => state.markAllNotificationsRead);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = getUnreadCount();

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => markAllNotificationsRead(), 500);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="notification-wrapper" ref={dropdownRef}>
      <button
        className="notification-bell"
        onClick={handleBellClick}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>通知中心</h3>
            {notifications.length > 0 && (
              <span className="dropdown-count">{notifications.length} 条消息</span>
            )}
          </div>
          <div className="dropdown-list">
            {notifications.length === 0 ? (
              <div className="dropdown-empty">暂无通知</div>
            ) : (
              notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? '' : 'unread'}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => markNotificationRead(notification.id)}
                >
                  <div className={`notification-icon ${notification.type}`}>
                    {notification.type === 'status' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="notification-content">
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-body">{notification.content}</p>
                    <span className="notification-time">{formatTime(notification.createdAt)}</span>
                  </div>
                  <button
                    className="notification-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

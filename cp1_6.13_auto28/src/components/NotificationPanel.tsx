import React from 'react';
import { useApp } from '../context/AppContext';

const NotificationPanel: React.FC = () => {
  const { notifications, dismissNotification } = useApp();
  const displayedNotifications = notifications.slice(0, 3);

  return (
    <div className="notification-panel">
      {displayedNotifications.map((notification, index) => (
        <div
          key={notification._id}
          className="notification-card"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="notification-content">
            <div className="notification-title">{notification.activityName}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
          <button
            className="notification-close"
            onClick={() => dismissNotification(notification._id)}
            aria-label="关闭通知"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationPanel;

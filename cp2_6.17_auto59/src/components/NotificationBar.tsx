import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationBar: React.FC = () => {
  const { notifications } = useNotifications();

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="notification-enter"
          style={{
            width: 300,
            height: 60,
            background: '#1a237e',
            color: '#ffffff',
            borderRadius: 8,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(26,35,126,0.3)',
          }}
        >
          <span style={{ marginRight: 10 }}>📢</span>
          <span>{notif.message}</span>
        </div>
      ))}
    </div>
  );
};

export default NotificationBar;

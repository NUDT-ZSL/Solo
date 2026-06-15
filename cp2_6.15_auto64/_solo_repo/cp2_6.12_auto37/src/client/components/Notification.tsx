import React, { useEffect, useState } from 'react';
import './Notification.css';

interface NotificationProps {
  message: string;
  visible: boolean;
  duration?: number;
  onClose?: () => void;
}

const Notification: React.FC<NotificationProps> = ({
  message,
  visible,
  duration = 3000,
  onClose
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      if (duration > 0) {
        const timer = setTimeout(() => {
          setShow(false);
          setTimeout(() => {
            onClose?.();
          }, 300);
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [visible, duration, onClose]);

  if (!visible && !show) return null;

  return (
    <div className={`notification ${show ? 'show' : 'hide'}`}>
      <div className="notification-content">
        <span className="notification-icon">🔔</span>
        <span className="notification-text">{message}</span>
      </div>
    </div>
  );
};

export default Notification;

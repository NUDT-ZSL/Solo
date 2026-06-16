import { useEffect, useState } from 'react';
import './Notification.css';

interface NotificationProps {
  message: string | null;
  onClose: () => void;
  duration?: number;
}

export default function Notification({ message, onClose, duration = 3000 }: NotificationProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      setExiting(false);
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(() => {
          setVisible(false);
          onClose();
        }, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!visible && !message) return null;

  return (
    <div
      className="notification"
      style={{
        animation: exiting ? 'notifyOut 0.3s ease-in forwards' : 'notifyIn 0.3s ease-out',
      }}
    >
      <span className="notification-icon">✨</span>
      <span className="notification-text">获得：{message}</span>
    </div>
  );
}

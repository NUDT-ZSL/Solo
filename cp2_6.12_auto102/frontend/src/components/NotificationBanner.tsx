import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Reservation } from '../context/AppContext';
import './NotificationBanner.css';

interface NotificationBannerProps {
  notifications: Reservation[];
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ notifications }) => {
  const navigate = useNavigate();

  if (notifications.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div className="notification-banner" onClick={() => navigate('/borrow')}>
      <span className="notification-icon">⚠️</span>
      <div className="notification-content">
        <span className="notification-text">
          您有 <strong>{notifications.length}</strong> 本图书待取书
          {notifications.map((n, i) => (
            <span key={n.id}>
              {i > 0 && '、'}《{n.title}》取书日期：{formatDate(n.pickup_date)}
            </span>
          ))}
        </span>
        <span className="notification-link">查看详情 →</span>
      </div>
      <button className="notification-close" onClick={(e) => {
        e.stopPropagation();
      }}>×</button>
    </div>
  );
};

export default NotificationBanner;

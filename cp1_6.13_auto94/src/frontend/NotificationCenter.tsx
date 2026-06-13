import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Notification } from './types';
import { UserContext, ToastContext } from './App';

const notificationTypeConfig = {
  swap_request: {
    icon: '📩',
    iconClass: 'request',
    message: (from: string, collectibleName: string) =>
      `<strong>@${from}</strong> 想要交换你的藏品「${collectibleName}」`
  },
  swap_accepted: {
    icon: '✅',
    iconClass: 'accepted',
    message: (from: string, collectibleName: string) =>
      `<strong>@${from}</strong> 接受了你对「${collectibleName}」的交换请求`
  },
  swap_rejected: {
    icon: '❌',
    iconClass: 'rejected',
    message: (from: string, collectibleName: string) =>
      `<strong>@${from}</strong> 拒绝了你对「${collectibleName}」的交换请求`
  }
};

function NotificationItem({
  notification,
  index,
  onAccept,
  onReject,
  onMarkRead
}: {
  notification: Notification;
  index: number;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const config = notificationTypeConfig[notification.type];
  const isPendingRequest =
    notification.type === 'swap_request' && !notification.read;

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification._id);
    }
  };

  return (
    <div
      className={`notification-item ${!notification.read ? 'unread' : ''}`}
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={handleClick}
    >
      <div className={`notification-icon ${config.iconClass}`}>{config.icon}</div>
      <div className="notification-content">
        <p
          className="notification-text"
          dangerouslySetInnerHTML={{
            __html: config.message(notification.fromUser, notification.collectibleName)
          }}
        />
        <p className="notification-time">
          {new Date(notification.createdAt).toLocaleString('zh-CN')}
        </p>
        {isPendingRequest && (
          <div className="notification-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-success btn-sm"
              onClick={() => onAccept(notification.swapRequestId)}
            >
              ✓ 接受
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onReject(notification.swapRequestId)}
            >
              ✕ 拒绝
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, refreshNotifications } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/notifications/${currentUser}`);
      setNotifications(response.data);
    } catch (error) {
      console.error('获取通知失败:', error);
      showToast('获取通知失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentUser]);

  const markAsRead = async (id: string) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      refreshNotifications();
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  const handleAccept = async (swapRequestId: string) => {
    try {
      await axios.post(`/api/swap/${swapRequestId}/accept`);
      showToast('已接受交换请求', 'success');
      fetchNotifications();
      refreshNotifications();
    } catch (error) {
      console.error('接受交换失败:', error);
      showToast('操作失败', 'error');
    }
  };

  const handleReject = async (swapRequestId: string) => {
    try {
      await axios.post(`/api/swap/${swapRequestId}/reject`);
      showToast('已拒绝交换请求', 'success');
      fetchNotifications();
      refreshNotifications();
    } catch (error) {
      console.error('拒绝交换失败:', error);
      showToast('操作失败', 'error');
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="notification-page">
      <div className="back-link" onClick={() => navigate('/')}>
        ← 返回藏品墙
      </div>
      <h1 className="page-title">通知中心</h1>
      <p className="page-subtitle">
        当前以 <span style={{ color: '#f97316', fontWeight: 600 }}>@{currentUser}</span>{' '}
        身份查看，共 {notifications.length} 条通知
      </p>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <h3 style={{ marginBottom: 8 }}>暂无通知</h3>
          <p>当有交换请求时会在这里显示</p>
        </div>
      ) : (
        <>
          {unreadNotifications.length > 0 && (
            <div className="notification-section">
              <h2 className="notification-section-title">
                未读通知 <span className="badge">{unreadNotifications.length}</span>
              </h2>
              {unreadNotifications.map((notification, index) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  index={index}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onMarkRead={markAsRead}
                />
              ))}
            </div>
          )}

          {readNotifications.length > 0 && (
            <div className="notification-section">
              <h2 className="notification-section-title">已读通知</h2>
              {readNotifications.map((notification, index) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  index={index + unreadNotifications.length}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onMarkRead={markAsRead}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

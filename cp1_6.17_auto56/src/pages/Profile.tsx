import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Transaction, Notification } from '../db/Database';
import db from '../db/Database';
import auctionEngine from '../db/AuctionEngine';
import './Profile.css';

export function Profile() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'notifications'>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [version, setVersion] = useState(0);

  const currentUserId = 'user-2';
  const user = db.getUser(currentUserId);

  useEffect(() => {
    loadData();
  }, [version, activeTab]);

  useEffect(() => {
    const unsubscribe = auctionEngine.onSettle(() => {
      setVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  const loadData = () => {
    if (activeTab === 'transactions') {
      const txs = db.getTransactionsByUser(currentUserId);
      setTransactions(txs);
    } else {
      const u = db.getUser(currentUserId);
      setNotifications(u?.notifications || []);
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    db.markNotificationRead(currentUserId, notificationId);
    setVersion(v => v + 1);
  };

  const handleMarkAllRead = () => {
    const user = db.getUser(currentUserId);
    if (user) {
      user.notifications.forEach(n => {
        n.read = true;
      });
      db.updateUser(user);
      setVersion(v => v + 1);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'won':
        return '🏆';
      case 'outbid':
        return '🔔';
      case 'system':
        return '📢';
      default:
        return '📬';
    }
  };

  return (
    <div className="profile-page">
      <header className="app-header">
        <div className="container app-header__inner">
          <Link to="/" className="app-logo">
            <span className="app-logo__icon">◈</span>
            <span className="app-logo__text">ArtVault</span>
          </Link>
          
          <nav className="app-nav">
            <Link to="/" className="app-nav__link">展厅</Link>
            <Link to="/profile" className="app-nav__link active">我的</Link>
          </nav>
        </div>
      </header>

      <main className="container main-content">
        <div className="profile-header">
          <div className="profile-user">
            <div
              className="profile-avatar"
              style={{ backgroundColor: user?.avatar || '#ccc' }}
            >
              {user?.name.charAt(0) || '?'}
            </div>
            <div className="profile-info">
              <h1 className="profile-name">{user?.name || '访客'}</h1>
              <p className="profile-role">艺术收藏家</p>
            </div>
          </div>
          
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat__value">{transactions.length}</span>
              <span className="profile-stat__label">交易记录</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat__value">{unreadCount}</span>
              <span className="profile-stat__label">未读通知</span>
            </div>
          </div>
        </div>

        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            交易历史
          </button>
          <button
            className={`profile-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            通知中心
            {unreadCount > 0 && (
              <span className="profile-tab__badge">{unreadCount}</span>
            )}
          </button>
        </div>

        <div className="profile-content">
          {activeTab === 'transactions' && (
            <div className="transactions-list">
              {transactions.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state__icon">📋</span>
                  <p className="empty-state__text">暂无交易记录</p>
                  <Link to="/" className="back-btn">去逛逛展厅</Link>
                </div>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} className="transaction-card">
                    <div className="transaction-card__header">
                      <span className={`transaction-card__type ${tx.buyerId === currentUserId ? 'buy' : 'sell'}`}>
                        {tx.buyerId === currentUserId ? '买入' : '卖出'}
                      </span>
                      <span className="transaction-card__price">¥{tx.price}</span>
                    </div>
                    
                    <div className="transaction-card__body">
                      <h3 className="transaction-card__artwork">{tx.artworkTitle}</h3>
                      <p className="transaction-card__gallery">
                        来自画廊：{tx.galleryName}
                      </p>
                    </div>
                    
                    <div className="transaction-card__footer">
                      <span className="transaction-card__date">
                        {formatDate(tx.timestamp)}
                      </span>
                      <span className="transaction-card__status completed">
                        已完成
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="notifications-section">
              {notifications.length > 0 && (
                <div className="notifications-header">
                  <span>共 {notifications.length} 条通知</span>
                  {unreadCount > 0 && (
                    <button className="mark-all-btn" onClick={handleMarkAllRead}>
                      全部已读
                    </button>
                  )}
                </div>
              )}
              
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-state__icon">🔔</span>
                    <p className="empty-state__text">暂无通知</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`notification-item ${!notif.read ? 'unread' : ''}`}
                      onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                    >
                      <span className="notification-item__icon">
                        {getNotificationIcon(notif.type)}
                      </span>
                      <div className="notification-item__content">
                        <p className="notification-item__message">{notif.message}</p>
                        <span className="notification-item__time">
                          {formatDate(notif.timestamp)}
                        </span>
                      </div>
                      {!notif.read && (
                        <span className="notification-item__dot" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Profile;

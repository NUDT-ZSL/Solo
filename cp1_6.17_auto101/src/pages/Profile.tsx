import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, PurchaseItem } from '../api';

export default function Profile() {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = api.getUser();
    if (!currentUser) {
      navigate('/auth');
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.works
      .purchases(sortOrder)
      .then((data) => setPurchases(data.purchases))
      .catch((err) => console.error('Failed to fetch purchases:', err))
      .finally(() => setLoading(false));
  }, [sortOrder, user]);

  const handleLogout = () => {
    api.removeToken();
    api.removeUser();
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h2>{user.username}</h2>
        <p>欢迎回来</p>
        <button
          className="btn-buy"
          style={{ marginTop: 12, padding: '8px 20px' }}
          onClick={handleLogout}
        >
          退出登录
        </button>
      </div>

      <h3 className="section-title">购买记录</h3>

      <div className="sort-controls">
        <span>排序：</span>
        <button
          className={sortOrder === 'newest' ? 'active' : ''}
          onClick={() => setSortOrder('newest')}
        >
          最近优先
        </button>
        <button
          className={sortOrder === 'oldest' ? 'active' : ''}
          onClick={() => setSortOrder('oldest')}
        >
          最早优先
        </button>
      </div>

      {loading ? (
        <div className="loading-indicator">加载中...</div>
      ) : purchases.length === 0 ? (
        <div className="empty-state">
          <p>暂无购买记录</p>
          <button className="btn-buy" onClick={() => navigate('/')}>浏览作品</button>
        </div>
      ) : (
        <div className="purchase-list">
          {purchases.map((item) => (
            <div key={item.transactionId} className="purchase-item">
              <img
                src={item.thumbnailPath}
                alt={item.title}
                className="purchase-thumb"
              />
              <div className="purchase-info">
                <div className="purchase-name">{item.title}</div>
                <div className="purchase-date">{item.purchasedAt}</div>
              </div>
              <div className="purchase-amount">¥{item.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

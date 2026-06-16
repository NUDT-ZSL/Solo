import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import './Profile.css';

interface Instrument {
  id: string;
  name: string;
  brand: string;
  model: string;
  price: number;
  condition: string;
  conditionScore: number;
  description: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  instrumentId: string;
  instrumentName: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  date: string;
  type: 'purchase' | 'sale';
}

function getConditionClass(condition: string): string {
  switch (condition) {
    case '全新': return 'condition-new';
    case '几乎全新': return 'condition-like-new';
    case '有明显使用痕迹': return 'condition-used';
    case '有瑕疵': return 'condition-damaged';
    default: return 'condition-used';
  }
}

function FavoriteItem({ 
  item, 
  userId, 
  onRemove 
}: { 
  item: Instrument; 
  userId: string;
  onRemove: (id: string) => void;
}) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(true);
    
    try {
      await fetch(`/api/favorites/${userId}/${item.id}`, { method: 'DELETE' });
      setTimeout(() => {
        onRemove(item.id);
      }, 200);
    } catch (err) {
      console.error('Failed to remove favorite:', err);
      setRemoving(false);
    }
  };

  return (
    <Link 
      to={`/instrument/${item.id}`}
      className={`favorite-card ${removing ? 'removing' : ''}`}
    >
      <div className="favorite-image">
        <img src={item.images[0]} alt={item.name} />
      </div>
      <div className="favorite-info">
        <h4 className="favorite-name">{item.name}</h4>
        <span className={`condition-tag-small ${getConditionClass(item.condition)}`}>
          {item.condition}
        </span>
        <span className="favorite-price">¥{item.price.toLocaleString()}</span>
      </div>
      <button 
        className="remove-favorite-btn"
        onClick={handleRemove}
        title="取消收藏"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </Link>
  );
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState<'favorites' | 'transactions'>('favorites');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  const avatar = localStorage.getItem('avatar');

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery<Instrument[]>({
    queryKey: ['favorites', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/favorites/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch favorites');
      return res.json();
    },
    enabled: !!userId
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/transactions/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    enabled: !!userId
  });

  const handleRemoveFavorite = (id: string) => {
    queryClient.setQueryData<Instrument[]>(['favorites', userId], (old) =>
      old?.filter(item => item.id !== id) || []
    );
  };

  if (!userId) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="not-logged-in">
            <p>请先登录后查看个人中心</p>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              去登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-header">
          <div className="profile-avatar">
            {avatar ? (
              <img src={avatar} alt={username || '用户'} />
            ) : (
              <span>{username?.charAt(0) || '用'}</span>
            )}
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{username || '用户'}</h2>
            <p className="profile-id">ID: {userId}</p>
          </div>
        </div>

        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <span className="tab-icon">♥</span>
            我的收藏
            {favorites.length > 0 && (
              <span className="tab-badge">{favorites.length}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <span className="tab-icon">📋</span>
            交易记录
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'favorites' && (
            <div className="favorites-section">
              {favoritesLoading ? (
                <div className="loading">
                  <div className="loading-spinner"></div>
                </div>
              ) : favorites.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">♡</div>
                  <p>还没有收藏的乐器</p>
                  <span>去首页逛逛，发现心仪的乐器吧</span>
                  <button 
                    className="btn btn-primary empty-btn"
                    onClick={() => navigate('/')}
                  >
                    去浏览
                  </button>
                </div>
              ) : (
                <div className="favorites-list">
                  {favorites.map(item => (
                    <FavoriteItem
                      key={item.id}
                      item={item}
                      userId={userId}
                      onRemove={handleRemoveFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="transactions-section">
              {transactionsLoading ? (
                <div className="loading">
                  <div className="loading-spinner"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <p>暂无交易记录</p>
                  <span>完成交易后记录将显示在这里</span>
                </div>
              ) : (
                <div className="transactions-table-wrapper">
                  <table className="transactions-table">
                    <thead>
                      <tr>
                        <th>乐器名称</th>
                        <th>类型</th>
                        <th>对方</th>
                        <th>成交价格</th>
                        <th>交易日期</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(tx => (
                        <tr key={tx.id} className="transaction-row">
                          <td className="tx-instrument">
                            <Link to={`/instrument/${tx.instrumentId}`}>
                              {tx.instrumentName}
                            </Link>
                          </td>
                          <td>
                            <span className={`tx-type ${tx.type}`}>
                              {tx.type === 'purchase' ? '买入' : '卖出'}
                            </span>
                          </td>
                          <td>
                            {tx.type === 'purchase' ? tx.sellerName : tx.buyerName}
                          </td>
                          <td className="tx-price">
                            ¥{tx.price.toLocaleString()}
                          </td>
                          <td className="tx-date">
                            {tx.date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

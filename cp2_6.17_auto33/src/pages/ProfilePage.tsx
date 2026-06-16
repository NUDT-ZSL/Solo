import dayjs from 'dayjs';
import { useCurrentUser, useUserTransactions } from '../hooks/useUser';
import LazyImage from '../components/LazyImage';

export default function ProfilePage() {
  const { user, loading: userLoading } = useCurrentUser();
  const { transactions, loading: txLoading } = useUserTransactions(user?.id);

  const renderStars = (count: number) => {
    return '★'.repeat(count) + '☆'.repeat(Math.max(0, 5 - count));
  };

  if (userLoading) {
    return <div className="loading-text">加载中...</div>;
  }

  if (!user) {
    return <div className="loading-text">用户信息获取失败</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">个人中心</h1>
        <p className="page-subtitle">查看您的积分和交换记录</p>
      </div>

      <div className="profile-header">
        <div className="profile-avatar">
          <img src={user.avatar} alt={user.username} />
        </div>
        <div className="profile-info">
          <div className="profile-name">
            {user.username}
            <span
              className="reputation-stars"
              style={{ marginLeft: 12, fontSize: 18 }}
            >
              {renderStars(user.reputation)}
            </span>
          </div>
          <div className="profile-points-label">我的积分</div>
          <div className="profile-points">{user.points}</div>
        </div>
      </div>

      <div className="transactions-list">
        <div className="transactions-header">交换记录</div>
        {txLoading ? (
          <div className="loading-text">加载中...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>暂无交换记录</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div className="transaction-item" key={tx.id}>
              <div className="transaction-thumb">
                <LazyImage src={tx.itemImage} alt={tx.itemName} />
              </div>
              <div className="transaction-info">
                <div className="transaction-name">{tx.itemName}</div>
                <div className="transaction-time">
                  {dayjs(tx.time).format('YYYY-MM-DD HH:mm')} ·{' '}
                  {tx.direction === 'receive' ? '收到来自' : '交换给'}{' '}
                  @{tx.otherUserName}
                </div>
              </div>
              <div
                className={`transaction-points ${
                  tx.direction === 'receive' ? 'receive' : 'give'
                }`}
              >
                {tx.direction === 'receive' ? '+' : '-'}
                {tx.points}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

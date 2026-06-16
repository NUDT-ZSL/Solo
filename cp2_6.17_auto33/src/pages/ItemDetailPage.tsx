import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { useItemDetail } from '../hooks/useItems';
import { useCurrentUser, useUser } from '../hooks/useUser';
import ItemTimeline from '../components/ItemTimeline';
import ExchangePage from './ExchangePage';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { item, loading, error, exchangeItem } = useItemDetail(id);
  const { user: currentUser, refreshUser } = useCurrentUser();
  const { user: owner } = useUser(item?.ownerId);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeError, setExchangeError] = useState('');
  const [exchangeSuccess, setExchangeSuccess] = useState(false);

  const handleExchange = async (message: string) => {
    if (!currentUser || !item) return;
    try {
      setExchangeError('');
      await exchangeItem(currentUser.id, message);
      await refreshUser();
      setExchangeSuccess(true);
      setShowExchangeModal(false);
    } catch (err) {
      setExchangeError(err instanceof Error ? err.message : '交换失败');
    }
  };

  if (loading) {
    return <div className="loading-text">加载中...</div>;
  }

  if (error || !item) {
    return <div className="loading-text">{error || '物品不存在'}</div>;
  }

  const renderStars = (count: number) => {
    return '★'.repeat(count) + '☆'.repeat(Math.max(0, 5 - count));
  };

  return (
    <div>
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← 返回列表
      </button>

      {exchangeSuccess && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#d8f3dc',
            color: '#2d6a4f',
            borderRadius: '12px',
            marginBottom: '20px',
            fontWeight: 500,
          }}
        >
          ✓ 交换成功！积分已扣除，物品已从广场移除。
        </div>
      )}

      <div className="detail-container">
        <div className="detail-image">
          <img src={item.image} alt={item.name} />
        </div>
        <div className="detail-info">
          <h1 className="detail-title">{item.name}</h1>
          <div className="detail-points">{item.points} 积分</div>
          <p className="detail-desc">{item.description}</p>

          <div className="detail-meta">
            <div className="detail-meta-row">
              <span className="detail-meta-label">新旧程度</span>
              <span className="detail-meta-value">{item.condition}</span>
            </div>
            <div className="detail-meta-row">
              <span className="detail-meta-label">物品分类</span>
              <span className="detail-meta-value">{item.category}</span>
            </div>
            <div className="detail-meta-row">
              <span className="detail-meta-label">发布人</span>
              <span className="detail-meta-value">
                @{item.ownerName}
                {owner && (
                  <span className="reputation-stars" style={{ marginLeft: 8 }}>
                    {renderStars(owner.reputation)}
                  </span>
                )}
              </span>
            </div>
            <div className="detail-meta-row">
              <span className="detail-meta-label">发布时间</span>
              <span className="detail-meta-value">
                {dayjs(item.createdAt).fromNow()}
              </span>
            </div>
          </div>

          {item.status === 'exchanged' ? (
            <button className="exchange-btn" disabled>
              物品已被交换
            </button>
          ) : currentUser?.id === item.ownerId ? (
            <button className="exchange-btn" disabled>
              这是您发布的物品
            </button>
          ) : currentUser && currentUser.points < item.points ? (
            <button className="exchange-btn" disabled>
              积分不足（当前 {currentUser.points} 积分）
            </button>
          ) : (
            <button
              className="exchange-btn"
              onClick={() => {
                setShowExchangeModal(true);
                setExchangeError('');
                setExchangeSuccess(false);
              }}
            >
              用积分交换
            </button>
          )}
        </div>
      </div>

      <ItemTimeline item={item} />

      {showExchangeModal && (
        <ExchangePage
          item={item}
          currentUser={currentUser}
          onCancel={() => setShowExchangeModal(false)}
          onConfirm={handleExchange}
          error={exchangeError}
        />
      )}
    </div>
  );
}

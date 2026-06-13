import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { Collectible } from './types';
import { UserContext, ToastContext } from './App';

function SwapItem({
  collectible,
  index,
  onRequestSwap,
  isOwner
}: {
  collectible: Collectible;
  index: number;
  onRequestSwap: () => void;
  isOwner: boolean;
}) {
  const handleSwapClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[SwapMarket] Request swap clicked for:', collectible.name);
    onRequestSwap();
  };

  return (
    <div
      className="swap-item"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="swap-thumbnail">
        <img src={collectible.thumbnail} alt={collectible.name} />
      </div>
      <div className="swap-info">
        <div className="swap-name">{collectible.name}</div>
        <div className="swap-series">{collectible.series}</div>
        <div className="swap-owner">
          所有者：<span>@{collectible.owner}</span>
        </div>
      </div>
      {isOwner ? (
        <span className="status-tag status-swap">我的藏品</span>
      ) : (
        <button
          className="btn btn-primary"
          onClick={handleSwapClick}
          type="button"
        >
          🤝 请求交换
        </button>
      )}
    </div>
  );
}

export default function SwapMarket() {
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useContext(UserContext);
  const { showToast } = useContext(ToastContext);

  const fetchSwapItems = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[SwapMarket] Fetching swap items');
      const response = await axios.get('/api/swap');
      console.log('[SwapMarket] Got:', response.data.length, 'items');
      setCollectibles(response.data);
    } catch (error) {
      console.error('获取待交换列表失败:', error);
      showToast('获取待交换列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSwapItems();
  }, [fetchSwapItems]);

  const handleRequestSwap = async (collectibleId: string, collectibleName: string, owner: string) => {
    try {
      console.log('[SwapMarket] Sending swap request:', { collectibleId, requester: currentUser });
      const response = await axios.post('/api/swap/request', {
        collectibleId: collectibleId,
        requester: currentUser
      });
      console.log('[SwapMarket] Request sent successfully:', response.data);
      showToast(`已向 @${owner} 发送「${collectibleName}」的交换请求`, 'success');
    } catch (error) {
      console.error('发送交换请求失败:', error);
      const errMsg = (error as any).response?.data?.error || '发送请求失败，请稍后重试';
      showToast(errMsg, 'error');
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="container">
      <h1 className="page-title">交换广场</h1>
      <p className="page-subtitle">
        当前以 <span style={{ color: '#f97316', fontWeight: 600 }}>@{currentUser}</span>{' '}
        身份浏览，共 {collectibles.length} 件待交换藏品
      </p>

      {collectibles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔄</div>
          <h3 style={{ marginBottom: 8 }}>暂无待交换藏品</h3>
          <p>可以将自己的重复藏品标记为"待交换"来参与交换</p>
        </div>
      ) : (
        <div className="swap-list">
          {collectibles.map((collectible, index) => (
            <SwapItem
              key={collectible._id}
              collectible={collectible}
              index={index}
              isOwner={collectible.owner === currentUser}
              onRequestSwap={() =>
                handleRequestSwap(collectible._id, collectible.name, collectible.owner)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

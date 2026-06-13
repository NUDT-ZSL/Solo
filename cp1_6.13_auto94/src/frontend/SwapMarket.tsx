import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Collectible } from './types';
import { UserContext, ToastContext } from './App';

function SwapItem({
  collectible,
  index,
  onRequestSwap
}: {
  collectible: Collectible;
  index: number;
  onRequestSwap: () => void;
}) {
  const { currentUser } = useContext(UserContext);
  const isOwner = collectible.owner === currentUser;

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
        <button className="btn btn-primary" onClick={onRequestSwap}>
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

  const fetchSwapItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/swap');
      setCollectibles(response.data);
    } catch (error) {
      console.error('获取待交换列表失败:', error);
      showToast('获取待交换列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSwapItems();
  }, []);

  const handleRequestSwap = async (collectibleId: string, collectibleName: string) => {
    try {
      await axios.post('/api/swap/request', {
        collectibleId,
        requester: currentUser
      });
      showToast(`已向所有者发送「${collectibleName}」的交换请求`, 'success');
    } catch (error) {
      console.error('发送交换请求失败:', error);
      showToast('发送请求失败，请稍后重试', 'error');
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
              onRequestSwap={() =>
                handleRequestSwap(collectible._id, collectible.name)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Collectible, statusLabels, StatusType } from './types';
import { UserContext } from './App';

const statusColors: Record<StatusType, string> = {
  new: 'status-new',
  opened: 'status-opened',
  swap: 'status-swap'
};

function CollectibleCard({
  collectible,
  index,
  onClick
}: {
  collectible: Collectible;
  index: number;
  onClick: () => void;
}) {
  return (
    <div
      className="card"
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={onClick}
    >
      <div className="card-image">
        <img src={collectible.thumbnail} alt={collectible.name} />
      </div>
      <div className="card-content">
        <div className="card-name">{collectible.name}</div>
        <div className="card-series">{collectible.series}</div>
        <div className="card-footer">
          <span className={`status-tag ${statusColors[collectible.status]}`}>
            {statusLabels[collectible.status]}
          </span>
          <span className="card-owner">@{collectible.owner}</span>
        </div>
      </div>
    </div>
  );
}

export default function CollectionWall() {
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useContext(UserContext);

  const fetchCollectibles = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/collectibles');
      setCollectibles(response.data);
    } catch (error) {
      console.error('获取藏品列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectibles();
    window.addEventListener('collectionUpdated', fetchCollectibles);
    return () => window.removeEventListener('collectionUpdated', fetchCollectibles);
  }, []);

  const handleCardClick = (id: string) => {
    navigate(`/collection/${id}`);
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="container">
      <h1 className="page-title">我的藏品墙</h1>
      <p className="page-subtitle">
        当前以 <span style={{ color: '#f97316', fontWeight: 600 }}>@{currentUser}</span> 身份浏览，共 {collectibles.length} 件藏品
      </p>
      <div className="collection-grid">
        {collectibles.map((collectible, index) => (
          <CollectibleCard
            key={collectible._id}
            collectible={collectible}
            index={index}
            onClick={() => handleCardClick(collectible._id)}
          />
        ))}
      </div>
    </div>
  );
}

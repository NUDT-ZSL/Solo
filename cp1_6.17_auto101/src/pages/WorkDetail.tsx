import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, WorkItem } from '../api';
import BuyModal from '../components/BuyModal';

export default function WorkDetail() {
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<WorkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.works
      .detail(id)
      .then((data) => setWork(data))
      .catch((err) => setError(err.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="page-container"><div className="loading-indicator">加载中...</div></div>;
  }

  if (error || !work) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <p>{error || '作品不存在'}</p>
          <button className="btn-buy" onClick={() => navigate('/')}>返回首页</button>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <div className="detail-image-area">
        <img src={work.watermarkedPath} alt={work.title} />
      </div>

      <div className="detail-info-area">
        <h1 className="detail-title">{work.title}</h1>
        <div className="detail-meta">作者：{work.authorName}</div>
        <div className="detail-meta">上传时间：{work.createdAt}</div>

        <div className="detail-price">¥{work.price.toFixed(2)}</div>

        {work.style && (
          <div className="detail-tags">
            {work.style.split(/[,，]/).map((tag, i) => (
              <span key={i} className="detail-tag">{tag.trim()}</span>
            ))}
          </div>
        )}

        {work.description && (
          <div className="detail-description">{work.description}</div>
        )}

        <button className="btn-buy" onClick={() => setShowBuyModal(true)} style={{ width: '100%', padding: 14, fontSize: 16 }}>
          立即购买
        </button>
      </div>

      {showBuyModal && (
        <BuyModal
          work={work}
          onClose={() => setShowBuyModal(false)}
          onSuccess={() => {
            setShowBuyModal(false);
            navigate('/profile');
          }}
        />
      )}
    </div>
  );
}

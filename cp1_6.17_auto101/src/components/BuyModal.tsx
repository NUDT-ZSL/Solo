import React, { useState } from 'react';
import { api, WorkItem } from '../api';

interface BuyModalProps {
  work: WorkItem;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BuyModal({ work, onClose, onSuccess }: BuyModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBuy = async () => {
    setLoading(true);
    setError('');
    try {
      await api.works.buy(work.id);
      onSuccess();
    } catch (err: any) {
      setError(err.message || '购买失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">确认购买</h2>
        <img
          src={work.watermarkedPath}
          alt={work.title}
          className="modal-image"
        />
        <div className="modal-info">
          <div className="modal-info-row">
            <span>作品名称</span>
            <span style={{ fontWeight: 600 }}>{work.title}</span>
          </div>
          <div className="modal-info-row">
            <span>作者</span>
            <span>{work.authorName}</span>
          </div>
          <div className="modal-info-row">
            <span>风格</span>
            <span>{work.style || '未分类'}</span>
          </div>
          <div className="modal-info-row">
            <span>价格</span>
            <span className="modal-price">¥{work.price.toFixed(2)}</span>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>
            取消
          </button>
          <button className="btn-confirm" onClick={handleBuy} disabled={loading}>
            {loading ? '处理中...' : '确认购买'}
          </button>
        </div>
      </div>
    </div>
  );
}

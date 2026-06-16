import { useState } from 'react';
import type { Item, User } from '../types';

interface ExchangePageProps {
  item: Item;
  currentUser: User | null;
  onCancel: () => void;
  onConfirm: (message: string) => void;
  error: string;
}

export default function ExchangePage({
  item,
  currentUser,
  onCancel,
  onConfirm,
  error,
}: ExchangePageProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm(message);
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">确认交换</h3>
        <p className="modal-desc">
          您即将用 <strong style={{ color: '#2d6a4f' }}>{item.points} 积分</strong> 交换「
          {item.name}」。
          <br />
          当前积分：
          <strong style={{ color: '#2d6a4f' }}>
            {' '}
            {currentUser?.points || 0} 积分
          </strong>
          ，交换后剩余：
          <strong style={{ color: '#2d6a4f' }}>
            {' '}
            {(currentUser?.points || 0) - item.points} 积分
          </strong>
        </p>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: 'block',
              fontSize: 14,
              color: '#666',
              marginBottom: 8,
            }}
          >
            给卖家留言（可选）
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="说点什么吧..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: '10px',
              fontSize: 14,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {error && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#fde8e8',
              color: '#e74c3c',
              borderRadius: '8px',
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button
            className="modal-btn modal-btn-cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            取消
          </button>
          <button
            className="modal-btn modal-btn-confirm"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? '处理中...' : '确认交换'}
          </button>
        </div>
      </div>
    </div>
  );
}

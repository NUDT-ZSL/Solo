import React from 'react';
import './OrderSuccessModal.css';

interface OrderSuccessModalProps {
  open: boolean;
  type: 'create' | 'join';
  data: {
    targetDrinkName: string;
    tableNumber: number;
    deadline: number;
    participantsCount: number;
    maxParticipants: number;
  } | null;
  onClose: () => void;
}

const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ open, type, data, onClose }) => {
  if (!open || !data) return null;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const progress = (data.participantsCount / data.maxParticipants) * 100;
  const isNearlyFull = data.participantsCount >= data.maxParticipants - 1;

  return (
    <div className="success-overlay" onClick={onClose}>
      <div className="success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="success-icon">
          {type === 'create' ? '🎉' : '✅'}
        </div>
        <h2 className="success-title">
          {type === 'create' ? '拼单已成功发起！' : '你已成功加入拼单！'}
        </h2>
        <div className="success-details">
          <div className="success-detail-row">
            <span className="success-detail-label">目标饮品</span>
            <span className="success-detail-value drink">{data.targetDrinkName}</span>
          </div>
          <div className="success-detail-row">
            <span className="success-detail-label">碰头桌号</span>
            <span className="success-detail-value table">#{data.tableNumber}</span>
          </div>
          <div className="success-detail-row">
            <span className="success-detail-label">截止时间</span>
            <span className="success-detail-value">{formatTime(data.deadline)}</span>
          </div>
          <div className="success-detail-row">
            <span className="success-detail-label">当前人数</span>
            <span className={`success-detail-value ${isNearlyFull ? 'nearly-full' : ''}`}>
              {data.participantsCount} / {data.maxParticipants} 人
            </span>
          </div>
          <div className="success-progress">
            <div className="success-progress-bar">
              <div
                className={`success-progress-fill ${isNearlyFull ? 'urgent' : ''}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="success-progress-labels">
              <span>还差 {data.maxParticipants - data.participantsCount} 人成团</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
        <div className="success-tip">
          💡 拼单成功后将通知所有参与者，请准时前往桌号就座
        </div>
        <button className="success-btn" onClick={onClose}>
          我知道了
        </button>
      </div>
    </div>
  );
};

export default OrderSuccessModal;

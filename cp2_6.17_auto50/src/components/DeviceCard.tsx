import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useBorrow } from '../hooks/useBorrow';
import { useAuth } from '../context/AuthContext';
import type { Device } from '../types';
import './DeviceCard.css';

interface DeviceCardProps {
  device: Device;
}

const statusConfig = {
  available: { label: '空闲', className: 'status-available' },
  borrowed: { label: '被借', className: 'status-borrowed' },
  maintenance: { label: '维修', className: 'status-maintenance' },
};

export function DeviceCard({ device }: DeviceCardProps) {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { borrow, loading, error, reset } = useBorrow();
  const [showQR, setShowQR] = useState(false);
  const [borrowRecordId, setBorrowRecordId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const status = statusConfig[device.status];
  const canBorrow = device.status === 'available' && user && user.creditScore >= device.minCreditScore;
  const creditInsufficient = user && user.creditScore < device.minCreditScore;

  const handleCardClick = () => {
    navigate(`/device/${device.id}`);
  };

  const handleBorrowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canBorrow || !user) return;
    setShowConfirm(true);
  };

  const handleConfirmBorrow = async () => {
    if (!user) return;
    const record = await borrow(device.id, user.id);
    if (record) {
      setBorrowRecordId(record.id);
      setShowQR(true);
      setShowConfirm(false);
      await refreshUser();
    }
  };

  const handleCloseQR = () => {
    setShowQR(false);
    setBorrowRecordId(null);
    reset();
  };

  return (
    <>
      <div className="device-card" onClick={handleCardClick}>
        <div className="card-image-container">
          <img src={device.imageUrl} alt={device.name} className="card-image" />
          <span className={`status-badge ${status.className}`}>
            {status.label}
          </span>
        </div>
        <div className="card-content">
          <h3 className="card-title">{device.name}</h3>
          <span className="card-type">{device.type}</span>
          <div className="card-info">
            <span className="credit-requirement">
              信用分要求: {device.minCreditScore}
            </span>
          </div>
          <button
            className={`borrow-button ${canBorrow ? '' : 'disabled'}`}
            onClick={handleBorrowClick}
            disabled={!canBorrow || loading}
          >
            {loading ? '借用中...' : device.status !== 'available' ? '不可借用' : creditInsufficient ? '信用分不足' : '借用'}
          </button>
          {creditInsufficient && (
            <div className="credit-warning">
              您的信用分 ({user?.creditScore}) 不足
            </div>
          )}
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>确认借用</h3>
            <p>您确定要借用 <strong>{device.name}</strong> 吗？</p>
            <p className="modal-note">请按时归还，逾期将扣除信用分</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={handleConfirmBorrow} disabled={loading}>
                {loading ? '处理中...' : '确认借用'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQR && borrowRecordId && (
        <div className="modal-overlay" onClick={handleCloseQR}>
          <div className="modal-content qr-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseQR}>×</button>
            <h3>借用成功</h3>
            <p className="qr-desc">请向管理员出示此二维码确认借用</p>
            <div className="qr-container">
              <QRCodeSVG value={borrowRecordId} size={256} />
            </div>
            <p className="qr-record-id">记录编号: {borrowRecordId}</p>
          </div>
        </div>
      )}
    </>
  );
}

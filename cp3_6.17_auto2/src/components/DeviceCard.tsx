import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Device } from '../types';
import { useUser } from '../context/UserContext';
import { useBorrow } from '../hooks/useBorrow';
import BorrowConfirmModal from './BorrowConfirmModal';
import QRCodeModal from './QRCodeModal';

interface Props {
  device: Device;
  onBorrowSuccess?: () => void;
}

const statusMap: Record<Device['status'], { text: string; className: string }> = {
  available: { text: '空闲', className: 'available' },
  borrowed: { text: '被借', className: 'borrowed' },
  maintenance: { text: '维修', className: 'maintenance' }
};

export default function DeviceCard({ device, onBorrowSuccess }: Props) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { loading, error, data, borrow, resetBorrowState } = useBorrow();

  const [showConfirm, setShowConfirm] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const statusInfo = statusMap[device.status];
  const isAvailable = device.status === 'available';
  const hasSufficientCredit = user ? user.creditScore >= device.minCreditScore : false;
  const canBorrow = isAvailable && hasSufficientCredit;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.borrow-btn')) return;
    navigate(`/device/${device.id}`);
  };

  const handleBorrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canBorrow) return;
    setShowConfirm(true);
  };

  const handleConfirmBorrow = async () => {
    if (!user) return;
    const result = await borrow(device.id, user.id);
    if (result) {
      setShowConfirm(false);
      setShowQR(true);
      onBorrowSuccess?.();
    }
  };

  const handleCloseQR = () => {
    setShowQR(false);
    resetBorrowState();
  };

  const getBorrowButtonText = () => {
    if (!isAvailable) {
      if (device.status === 'borrowed') return '已借出';
      if (device.status === 'maintenance') return '维修中';
    }
    if (!hasSufficientCredit) return '信用不足';
    return '借用';
  };

  return (
    <>
      <div className="device-card" onClick={handleCardClick}>
        <div className="device-card-image">
          <img
            src={device.imageUrl}
            alt={device.name}
            loading="lazy"
          />
          <span className={`status-badge ${statusInfo.className}`}>
            {statusInfo.text}
          </span>
        </div>

        <div className="device-card-body">
          <span className="device-type-tag">{device.type}</span>
          <h3 className="device-card-name" title={device.name}>
            {device.name}
          </h3>

          <div className="device-card-footer">
            <div className="credit-requirement">
              <div className="credit-icon">★</div>
              <span>{device.minCreditScore}</span>
            </div>

            <button
              className={`borrow-btn ${!hasSufficientCredit && isAvailable ? 'low-credit' : ''}`}
              onClick={handleBorrowClick}
              disabled={!canBorrow}
              title={
                !isAvailable
                  ? device.status === 'borrowed' ? '该设备已被借出' : '该设备正在维修中'
                  : !hasSufficientCredit
                  ? `信用分不足，需要${device.minCreditScore}分，当前${user?.creditScore ?? 0}分`
                  : '点击借用设备'
              }
            >
              {loading ? (
                <span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '14px', height: '14px' }}></span>
              ) : getBorrowButtonText()}
            </button>
          </div>

          {!hasSufficientCredit && isAvailable && (
            <div style={{
              fontSize: '11px',
              color: 'var(--danger)',
              textAlign: 'right',
              marginTop: '4px'
            }}>
              需要 {device.minCreditScore} 分
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <BorrowConfirmModal
          device={device}
          onConfirm={handleConfirmBorrow}
          onCancel={() => setShowConfirm(false)}
          loading={loading}
        />
      )}

      {error && showConfirm && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000,
          padding: '12px 20px',
          background: 'rgba(239, 68, 68, 0.95)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {error}
        </div>
      )}

      {showQR && data && (
        <QRCodeModal
          record={data.record}
          deviceName={device.name}
          onClose={handleCloseQR}
        />
      )}
    </>
  );
}

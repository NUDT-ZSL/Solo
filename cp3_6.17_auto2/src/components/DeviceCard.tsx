import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Device, User } from '@/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';
import { useBorrow } from '@/hooks/useBorrow';
import { CURRENT_USER_ID } from '@/utils/constants';
import ConfirmModal from './ConfirmModal';
import QRModal from './QRModal';

interface DeviceCardProps {
  device: Device;
  currentUser?: User | null;
}

const DeviceCard = ({ device, currentUser }: DeviceCardProps) => {
  const navigate = useNavigate();
  const { borrow, borrowResult } = useBorrow();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [recordId, setRecordId] = useState('');

  const isAvailable = device.status === 'available';
  const meetsCreditScore = currentUser ? currentUser.creditScore >= device.minCreditScore : true;
  const canBorrow = isAvailable && meetsCreditScore;

  const handleCardClick = () => {
    navigate(`/device/${device.id}`);
  };

  const handleBorrowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canBorrow) return;
    setShowConfirm(true);
  };

  const handleConfirmBorrow = async () => {
    setShowConfirm(false);
    const result = await borrow(device.id, CURRENT_USER_ID);
    if (result.success && result.data) {
      setRecordId(result.data.id);
      setShowQR(true);
    }
  };

  const handleQRClose = () => {
    setShowQR(false);
    setRecordId('');
  };

  const getButtonStyle = () => {
    if (!canBorrow) {
      return {
        backgroundColor: '#94a3b8',
        cursor: 'not-allowed',
      };
    }
    return {
      backgroundColor: '#1e293b',
      cursor: 'pointer',
    };
  };

  return (
    <>
      <div
        style={{
          width: '240px',
          height: '320px',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }}
        onClick={handleCardClick}
      >
        <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
          <img
            src={device.imageUrl}
            alt={device.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: STATUS_COLORS[device.status],
            }}
          >
            {STATUS_LABELS[device.status]}
          </div>
        </div>

        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              fontSize: '12px',
              marginBottom: '8px',
              alignSelf: 'flex-start',
            }}
          >
            {device.type}
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {device.name}
          </h3>

          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', marginBottom: 'auto' }}>
            最低信用分: {device.minCreditScore}
          </p>

          <button
            onClick={handleBorrowClick}
            disabled={!canBorrow}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              marginTop: '12px',
              transition: 'all 0.2s',
              ...getButtonStyle(),
            }}
            onMouseEnter={(e) => {
              if (canBorrow) {
                e.currentTarget.style.backgroundColor = '#0f172a';
              }
            }}
            onMouseLeave={(e) => {
              if (canBorrow) {
                e.currentTarget.style.backgroundColor = '#1e293b';
              }
            }}
          >
            {!isAvailable
              ? '设备不可用'
              : !meetsCreditScore
              ? `信用分不足 (需${device.minCreditScore})`
              : borrowResult.loading
              ? '借用中...'
              : '立即借用'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="确认借用"
        message={`确定要借用「${device.name}」吗？请在24小时内归还，逾期将影响您的信用评分。`}
        onConfirm={handleConfirmBorrow}
        onCancel={() => setShowConfirm(false)}
        confirmText="确认借用"
        cancelText="再想想"
      />

      <QRModal isOpen={showQR} recordId={recordId} onClose={handleQRClose} />
    </>
  );
};

export default DeviceCard;

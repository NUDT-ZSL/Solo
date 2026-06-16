import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import dayjs from 'dayjs';
import { getDevice } from '../api/borrowApi';
import { useBorrow } from '../hooks/useBorrow';
import { useAuth } from '../context/AuthContext';
import type { Device } from '../types';
import './DeviceDetail.css';

const statusConfig = {
  available: { label: '空闲', className: 'status-available' },
  borrowed: { label: '被借', className: 'status-borrowed' },
  maintenance: { label: '维修', className: 'status-maintenance' },
};

export function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { borrow, loading, error, reset } = useBorrow();
  
  const [device, setDevice] = useState<Device | null>(null);
  const [loadingDevice, setLoadingDevice] = useState(true);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [borrowRecordId, setBorrowRecordId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchDevice = async () => {
      if (!id) return;
      try {
        setLoadingDevice(true);
        const data = await getDevice(id);
        setDevice(data);
      } catch (err) {
          setDeviceError(err instanceof Error ? err.message : '获取设备详情失败');
        } finally {
        setLoadingDevice(false);
      }
    };

    fetchDevice();
  }, [id]);

  const status = device ? statusConfig[device.status] : null;
  const canBorrow = device && device.status === 'available' && user && user.creditScore >= device.minCreditScore;
  const creditInsufficient = user && device && user.creditScore < device.minCreditScore;

  const handleBorrow = async () => {
    if (!device || !user) return;
    const record = await borrow(device.id, user.id);
    if (record) {
      setBorrowRecordId(record.id);
      setShowQR(true);
      setShowConfirm(false);
      await refreshUser();
      const updatedDevice = await getDevice(device.id);
      setDevice(updatedDevice);
    }
  };

  const handleCloseQR = () => {
    setShowQR(false);
    setBorrowRecordId(null);
    reset();
  };

  if (loadingDevice) {
    return <div className="detail-page"><div className="loading-state">加载中...</div></div>;
  }

  if (deviceError || !device) {
    return <div className="detail-page"><div className="error-state">{deviceError || '设备不存在'}</div></div>;
  }

  return (
    <div className="detail-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← 返回列表
      </button>

      <div className="detail-container">
        <div className="detail-image-section">
          <img src={device.imageUrl} alt={device.name} className="detail-image" />
        </div>

        <div className="detail-info-section">
          <div className="detail-header">
            <h1 className="detail-title">{device.name}</h1>
            {status && (
              <span className={`status-badge large ${status.className}`}>
                {status.label}
              </span>
            )}
          </div>

          <div className="detail-type">{device.type}</div>
          <p className="detail-description">{device.description}</p>

          <div className="specs-section">
            <h3>技术参数</h3>
            <div className="specs-grid">
              {Object.entries(device.specs).map(([key, value]) => (
              <div key={key} className="spec-item">
                <span className="spec-label">{key}</span>
                <span className="spec-value">{value}</span>
              </div>
            ))}
            </div>
          </div>

          <div className="credit-info">
            <span className="credit-label">最低信用分要求:</span>
            <span className={`credit-value ${creditInsufficient ? 'insufficient' : ''}`}>
              {device.minCreditScore} 分
            </span>
            {creditInsufficient && (
              <span className="credit-warning-text">
                您的信用分 ({user?.creditScore}) 不足
              </span>
            )}
          </div>

          <button
            className={`borrow-button-large ${canBorrow ? '' : 'disabled'}`}
            onClick={() => setShowConfirm(true)}
            disabled={!canBorrow || loading}
          >
            {loading ? '借用中...' : device.status !== 'available' ? '设备不可借用' : '立即借用'}
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>

      <div className="records-section">
        <h2>历史借用记录</h2>
        {device.borrowRecords && device.borrowRecords.length > 0 ? (
          <div className="records-list">
            {device.borrowRecords.map(record => (
              <div key={record.id} className="record-item">
                <div className="record-avatar">
                  {record.userName.charAt(0)}
                </div>
                <div className="record-info">
                  <span className="record-user">{record.userName}</span>
                  <span className="record-time">
                    借用: {dayjs(record.borrowTime).format('YYYY-MM-DD HH:mm')}
                  </span>
                  <span className="record-time">
                    归还: {record.returnTime ? dayjs(record.returnTime).format('YYYY-MM-DD HH:mm') : '未归还'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-records">暂无借用记录</p>
        )}
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
              <button className="btn-primary" onClick={handleBorrow} disabled={loading}>
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
    </div>
  );
}

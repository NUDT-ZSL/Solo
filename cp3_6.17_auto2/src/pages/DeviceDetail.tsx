import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { getDeviceById } from '../api/borrowApi';
import type { Device } from '../types';
import { useUser } from '../context/UserContext';
import { useBorrow } from '../hooks/useBorrow';
import BorrowConfirmModal from '../components/BorrowConfirmModal';
import QRCodeModal from '../components/QRCodeModal';

const statusMap: Record<Device['status'], { text: string; className: string }> = {
  available: { text: '空闲中', className: 'available' },
  borrowed: { text: '已借出', className: 'borrowed' },
  maintenance: { text: '维修中', className: 'maintenance' }
};

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { loading, error, data, borrow, resetBorrowState } = useBorrow();

  const [device, setDevice] = useState<Device | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const loadDevice = useCallback(async () => {
    if (!id) return;
    setPageLoading(true);
    setPageError(null);
    try {
      const result = await getDeviceById(id);
      setDevice(result);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : '加载设备详情失败');
    } finally {
      setPageLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDevice();
  }, [loadDevice]);

  if (!device) {
    // We'll return after this, but TypeScript needs this handled
  }

  const isAvailable = device?.status === 'available';
  const hasSufficientCredit = user ? (user.creditScore >= (device?.minCreditScore ?? 0)) : false;
  const canBorrow = !!device && isAvailable && hasSufficientCredit;

  const handleBorrowClick = () => {
    if (!canBorrow) return;
    setShowConfirm(true);
  };

  const handleConfirmBorrow = async () => {
    if (!user || !device) return;
    const result = await borrow(device.id, user.id);
    if (result) {
      setShowConfirm(false);
      setShowQR(true);
      setDevice({ ...device, status: 'borrowed' });
    }
  };

  const handleCloseQR = () => {
    setShowQR(false);
    resetBorrowState();
  };

  const getStatusBadge = (status: Device['status']) => {
    const info = statusMap[status];
    return (
      <span className={`status-tag ${status}`} style={{ padding: '6px 14px', fontSize: '13px' }}>
        {info.text}
      </span>
    );
  };

  const getRecordStatusLabel = (s: string) => {
    switch (s) {
      case 'borrowing': return '借用中';
      case 'returned-on-time': return '按时归还';
      case 'overdue-returned': return '超时归还';
      default: return s;
    }
  };

  if (pageLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  if (pageError || !device) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>😕</div>
        <h2 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
          {pageError || '设备不存在'}
        </h2>
        <Link to="/overview" className="btn btn-primary">
          ← 返回设备列表
        </Link>
      </div>
    );
  }

  return (
    <div className="page-transition">
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            color: 'var(--accent-blue)',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          ← 返回
        </button>
      </div>

      <div className="device-detail-layout">
        <div>
          <div className="detail-image-section">
            <div className="detail-image-wrapper">
              <img src={device.imageUrl} alt={device.name} />
            </div>

            <div className="detail-section" style={{ marginBottom: 0 }}>
              <h3 className="detail-section-title">技术参数</h3>
              <div className="specs-list">
                {Object.entries(device.specs).map(([key, value]) => (
                  <div key={key} className="spec-item">
                    <span className="spec-label">{key}</span>
                    <span className="spec-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            marginTop: '24px'
          }}>
            <h3 className="detail-section-title">历史借用记录</h3>
            {device.borrowHistory && device.borrowHistory.length > 0 ? (
              <div className="history-list">
                {device.borrowHistory.map(record => (
                  <div key={record.id} className="history-item">
                    <div className="history-avatar">
                      {record.userName.charAt(0)}
                    </div>
                    <div className="history-info">
                      <div className="history-user">{record.userName}</div>
                      <div className="history-dates">
                        <span>借: {dayjs(record.borrowTime).format('MM-DD HH:mm')}</span>
                        {record.returnTime && (
                          <span>还: {dayjs(record.returnTime).format('MM-DD HH:mm')}</span>
                        )}
                        {!record.returnTime && (
                          <span style={{ color: 'var(--accent-blue)' }}>
                            预计: {dayjs(record.expectedReturnTime).format('MM-DD HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`status-tag ${record.status}`}>
                      {getRecordStatusLabel(record.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state-icon" style={{ fontSize: '48px' }}>📋</div>
                <div className="empty-state-text">暂无借用记录</div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="sidebar-card">
            <div style={{ marginBottom: '16px' }}>
              <span className="device-type-tag" style={{ marginBottom: '12px', display: 'inline-block' }}>
                {device.type}
              </span>
            </div>
            <h1 className="device-title">{device.name}</h1>
            <div style={{ marginBottom: '20px' }}>
              {getStatusBadge(device.status)}
            </div>

            <div className="device-info-row">
              <span className="info-label">设备编号</span>
              <span className="info-value" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                {device.id.toUpperCase()}
              </span>
            </div>
            <div className="device-info-row">
              <span className="info-label">最低信用分</span>
              <span className="info-value">
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: user && user.creditScore >= device.minCreditScore ? 'var(--success)' : 'var(--danger)'
                }}>
                  ★ {device.minCreditScore}
                </span>
              </span>
            </div>
            {user && (
              <div className="device-info-row">
                <span className="info-label">我的信用分</span>
                <span className="info-value" style={{
                  color: user.creditScore >= device.minCreditScore ? 'var(--success)' : 'var(--danger)',
                  fontWeight: '600'
                }}>
                  {user.creditScore}
                </span>
              </div>
            )}
          </div>

          <div className="sidebar-card">
            <div className="borrow-action-section">
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleBorrowClick}
                disabled={!canBorrow}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: '16px', height: '16px' }}></span>
                    处理中...
                  </>
                ) : !isAvailable ? (
                  device.status === 'borrowed' ? '该设备已被借出' : '设备维修中'
                ) : !hasSufficientCredit ? (
                  '信用分不足'
                ) : (
                  '立即借用'
                )}
              </button>

              {!hasSufficientCredit && isAvailable && (
                <div className="credit-warning">
                  <span>⚠️</span>
                  <span>
                    需要信用分 {device.minCreditScore}，您当前 {user?.creditScore ?? 0} 分。
                    按时归还设备可提升信用分。
                  </span>
                </div>
              )}

              {error && (
                <div className="alert alert-error" style={{ marginTop: '16px', marginBottom: 0 }}>
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="sidebar-card">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>
              💡 借还须知
            </h3>
            <ul style={{
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6'
            }}>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--success)' }}>✓</span>
                <span>按时归还 +1 信用分</span>
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--danger)' }}>✗</span>
                <span>超时归还 -5 信用分</span>
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--accent-blue)' }}>⏱</span>
                <span>借用期限为 24 小时</span>
              </li>
              <li style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--warning)' }}>★</span>
                <span>信用分低于80无法借用高分设备</span>
              </li>
            </ul>
          </div>
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

      {showQR && data && (
        <QRCodeModal
          record={data.record}
          deviceName={device.name}
          onClose={handleCloseQR}
        />
      )}
    </div>
  );
}

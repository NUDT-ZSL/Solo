import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Clock, User } from 'lucide-react';
import dayjs from 'dayjs';
import { useBorrow } from '@/hooks/useBorrow';
import { CURRENT_USER_ID } from '@/utils/constants';
import { STATUS_LABELS, STATUS_COLORS, RECORD_STATUS_LABELS, RECORD_STATUS_COLORS } from '@/types';
import type { BorrowRecordWithDetails } from '@/types';
import ConfirmModal from '@/components/ConfirmModal';
import QRModal from '@/components/QRModal';

const DeviceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { device, user, records, borrow, fetchDevice, fetchUser, fetchRecords } = useBorrow();
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [recordId, setRecordId] = useState('');
  const [recordsWithDetails, setRecordsWithDetails] = useState<BorrowRecordWithDetails[]>([]);

  useEffect(() => {
    if (id) {
      fetchDevice(id);
      fetchUser(CURRENT_USER_ID);
      fetchRecords();
    }
  }, [id, fetchDevice, fetchUser, fetchRecords]);

  useEffect(() => {
    if (records.data && id) {
      const deviceRecords = records.data
        .filter((r) => r.deviceId === id)
        .sort((a, b) => dayjs(b.borrowTime).valueOf() - dayjs(a.borrowTime).valueOf())
        .slice(0, 10);
      setRecordsWithDetails(deviceRecords);
    }
  }, [records.data, id]);

  const deviceData = device.data;
  const currentUser = user.data;

  const isAvailable = deviceData?.status === 'available';
  const meetsCreditScore = currentUser && deviceData 
    ? currentUser.creditScore >= deviceData.minCreditScore 
    : true;
  const canBorrow = isAvailable && meetsCreditScore;

  const handleBorrow = () => {
    if (!canBorrow) return;
    setShowConfirm(true);
  };

  const handleConfirmBorrow = async () => {
    setShowConfirm(false);
    if (id) {
      const result = await borrow(id, CURRENT_USER_ID);
      if (result.success && result.data) {
        setRecordId(result.data.id);
        setShowQR(true);
      }
    }
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

  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (device.loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 60px)', backgroundColor: '#f8fafc' }}>
        <Loader2 size={32} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (device.error || !deviceData) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 60px)' }}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          {device.error || '设备不存在'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 60px)' }}>
      <button
        onClick={() => navigate('/overview')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: '#64748b',
          fontSize: '14px',
          cursor: 'pointer',
          marginBottom: '24px',
          padding: '8px 12px',
          borderRadius: '8px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f1f5f9';
          e.currentTarget.style.color = '#1e293b';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#64748b';
        }}
      >
        <ArrowLeft size={18} />
        返回设备列表
      </button>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <img
            src={deviceData.imageUrl}
            alt={deviceData.name}
            style={{ width: '100%', height: 'auto', borderRadius: '8px', maxHeight: '400px', objectFit: 'cover' }}
          />

          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#ffffff',
                      backgroundColor: STATUS_COLORS[deviceData.status],
                    }}
                  >
                    {STATUS_LABELS[deviceData.status]}
                  </span>
                  <span style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#f1f5f9', color: '#64748b' }}>
                    {deviceData.type}
                  </span>
                </div>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{deviceData.name}</h1>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>最低信用分要求</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>{deviceData.minCreditScore}</p>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>技术参数</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {Object.entries(deviceData.specifications).map(([key, value]) => (
                  <div key={key} style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>{key}</p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} />
                历史借用记录
              </h2>
              {recordsWithDetails.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '24px' }}>暂无借用记录</p>
              ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  {recordsWithDetails.map((record) => (
                    <div
                      key={record.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderBottom: '1px solid #e2e8f0',
                        gap: '16px',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        {getUserInitial(currentUser?.name || 'U')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                          <User size={14} style={{ color: '#94a3b8' }} />
                          <span style={{ fontSize: '14px', color: '#1e293b' }}>{currentUser?.name || '用户'}</span>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: '#ffffff',
                              backgroundColor: RECORD_STATUS_COLORS[record.status],
                            }}
                          >
                            {RECORD_STATUS_LABELS[record.status]}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          借用: {dayjs(record.borrowTime).format('YYYY-MM-DD HH:mm')}
                          {record.actualReturnTime && (
                            <> | 归还: {dayjs(record.actualReturnTime).format('YYYY-MM-DD HH:mm')}</>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!meetsCreditScore && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <p style={{ margin: 0, color: '#ef4444', fontSize: '14px' }}>
                  您的信用分 ({currentUser?.creditScore || 0}) 低于该设备要求的 {deviceData.minCreditScore} 分，无法借用此设备。
                </p>
              </div>
            )}

            <button
              onClick={handleBorrow}
              disabled={!canBorrow}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 600,
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
                ? '信用分不足'
                : '立即借用'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title="确认借用"
        message={`确定要借用「${deviceData.name}」吗？请在24小时内归还，逾期将影响您的信用评分。`}
        onConfirm={handleConfirmBorrow}
        onCancel={() => setShowConfirm(false)}
        confirmText="确认借用"
        cancelText="再想想"
      />

      <QRModal isOpen={showQR} recordId={recordId} onClose={() => { setShowQR(false); setRecordId(''); }} />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DeviceDetail;

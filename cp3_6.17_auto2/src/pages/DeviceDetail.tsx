import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDevice } from '../hooks/useDevices';
import { useUser } from '../hooks/useUser';
import { useRecords } from '../hooks/useRecords';
import { useBorrow } from '../hooks/useBorrow';
import { getUser } from '../api/borrowApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { QRModal } from '../components/QRModal';
import { User } from '../types';

const statusConfig = {
  available: { text: '可借用', color: '#22c55e', bg: '#dcfce7' },
  borrowed: { text: '已借出', color: '#f59e0b', bg: '#fef3c7' },
  maintenance: { text: '维护中', color: '#ef4444', bg: '#fee2e2' },
};

export function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const deviceId = id || null;

  const { data: device, loading: deviceLoading, error: deviceError } = useDevice(deviceId);
  const { data: user, loading: userLoading, error: userError } = useUser('user-1');
  const { data: records, loading: recordsLoading } = useRecords();
  const { borrow, loading: borrowLoading, data: borrowResult } = useBorrow();

  const [showConfirm, setShowConfirm] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [recordUsers, setRecordUsers] = useState<Record<string, User>>({});

  const deviceRecords = records
    ?.filter((r) => r.deviceId === deviceId)
    .sort((a, b) => new Date(b.borrowTime).getTime() - new Date(a.borrowTime).getTime()) || [];

  useEffect(() => {
    deviceRecords.forEach((record) => {
      if (!recordUsers[record.userId]) {
        getUser(record.userId).then((u) => {
          setRecordUsers((prev) => ({ ...prev, [record.userId]: u }));
        }).catch(() => {});
      }
    });
  }, [deviceRecords]);

  if (deviceLoading || userLoading || recordsLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '16px',
        color: '#6b7280',
      }}>
        加载中...
      </div>
    );
  }

  if (deviceError || userError) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '16px',
        color: '#ef4444',
      }}>
        错误: {deviceError || userError}
      </div>
    );
  }

  if (!device) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '16px',
        color: '#6b7280',
      }}>
        设备不存在
      </div>
    );
  }

  const status = statusConfig[device.status];
  const canBorrow = device.status === 'available' && user !== null && user.creditScore >= device.minCreditScore;

  const handleBorrowClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmBorrow = async () => {
    if (!device || !user) return;
    try {
      await borrow(device.id, user.id);
      setShowConfirm(false);
      setShowQR(true);
    } catch {
    }
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '32px 24px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
        marginBottom: '32px',
      }}>
        <div>
          <img
            src={device.imageUrl}
            alt={device.name}
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
              display: 'block',
            }}
          />
        </div>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              color: '#1f2937',
            }}>
              {device.name}
            </h1>
            <span style={{
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: 500,
              color: status.color,
              backgroundColor: status.bg,
            }}>
              {status.text}
            </span>
          </div>
          <p style={{
            margin: 0,
            marginBottom: '24px',
            fontSize: '16px',
            color: '#6b7280',
          }}>
            {device.type}
          </p>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              margin: 0,
              marginBottom: '12px',
              fontSize: '18px',
              fontWeight: 600,
              color: '#1f2937',
            }}>
              技术参数
            </h3>
            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              padding: '16px',
            }}>
              {Object.entries(device.specs).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>{key}</span>
                  <span style={{ color: '#1f2937', fontSize: '14px', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#6b7280',
            }}>
              最低信用分要求: <strong style={{ color: '#1f2937' }}>{device.minCreditScore}</strong>
            </p>
          </div>

          <button
            onClick={handleBorrowClick}
            disabled={!canBorrow || borrowLoading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              cursor: canBorrow && !borrowLoading ? 'pointer' : 'not-allowed',
              backgroundColor: canBorrow && !borrowLoading ? '#1e293b' : '#94a3b8',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            {borrowLoading ? '处理中...' :
             device.status === 'maintenance' ? '设备维护中' :
             device.status === 'borrowed' ? '设备已借出' :
             !user ? '加载中' :
             user.creditScore < device.minCreditScore ? `信用分不足 (当前: ${user.creditScore})` : '借用设备'}
          </button>
        </div>
      </div>

      <div>
        <h2 style={{
          margin: 0,
          marginBottom: '16px',
          fontSize: '20px',
          fontWeight: 600,
          color: '#1f2937',
        }}>
          历史借用记录
        </h2>
        {deviceRecords.length === 0 ? (
          <div style={{
            padding: '32px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#6b7280',
          }}>
            暂无借用记录
          </div>
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}>
            {deviceRecords.map((record, index) => {
              const recordUser = recordUsers[record.userId];
              return (
                <div
                  key={record.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    gap: '16px',
                    borderBottom: index < deviceRecords.length - 1 ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {recordUser ? getInitial(recordUser.name) : '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0,
                      marginBottom: '4px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#1f2937',
                    }}>
                      {recordUser ? recordUser.name : '加载中...'}
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#6b7280',
                    }}>
                      借用: {new Date(record.borrowTime).toLocaleString('zh-CN')}
                      {record.returnTime && (
                        <span> | 归还: {new Date(record.returnTime).toLocaleString('zh-CN')}</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={showConfirm}
        title="确认借用"
        message={`确定要借用「${device.name}」吗？借用后请在7天内归还。`}
        confirmText="确认借用"
        onConfirm={handleConfirmBorrow}
        onCancel={() => setShowConfirm(false)}
        loading={borrowLoading}
      />

      <QRModal
        open={showQR}
        onClose={() => setShowQR(false)}
        record={borrowResult}
      />
    </div>
  );
}

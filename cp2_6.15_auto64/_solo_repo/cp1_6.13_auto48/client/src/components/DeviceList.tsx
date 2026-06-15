import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface Device {
  _id: string;
  name: string;
  status: 'available' | 'borrowed' | 'maintenance';
  expectedReturnTime?: string;
  borrowCount: number;
  description: string;
}

function formatCountdown(targetTime: string): string {
  const now = new Date().getTime();
  const target = new Date(targetTime).getTime();
  const diff = target - now;

  if (diff <= 0) return '已逾期';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  parts.push(`${minutes}分钟`);
  return parts.join(' ');
}

function validateReturnTime(timeStr: string): string | null {
  if (!timeStr) return '请选择预计归还时间';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(timeStr)) {
    return '日期格式不正确';
  }
  const returnTime = new Date(timeStr);
  if (isNaN(returnTime.getTime())) return '日期格式不正确';
  if (returnTime.getTime() <= Date.now()) return '归还时间必须在当前时间之后';
  return null;
}

const STATUS_MAP: Record<string, { label: string; color: string; bgColor: string }> = {
  available: { label: '可借用', color: '#059669', bgColor: '#d1fae5' },
  borrowed: { label: '已借出', color: '#d97706', bgColor: '#fef3c7' },
  maintenance: { label: '维修中', color: '#6b7280', bgColor: '#e5e7eb' }
};

export default function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [returnTime, setReturnTime] = useState('');
  const [validationError, setValidationError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});
  const [isCompact, setIsCompact] = useState(window.innerWidth < 768);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await axios.get('/api/devices');
      setDevices(res.data);
    } catch (err) {
      console.error('Failed to fetch devices', err);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    const updateCountdowns = () => {
      const newCountdowns: Record<string, string> = {};
      devices.forEach((device) => {
        if (device.status === 'borrowed' && device.expectedReturnTime) {
          newCountdowns[device._id] = formatCountdown(device.expectedReturnTime);
        }
      });
      setCountdowns(newCountdowns);
    };

    updateCountdowns();

    intervalRef.current = setInterval(updateCountdowns, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [devices]);

  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBorrowClick = (device: Device) => {
    setSelectedDevice(device);
    setReturnTime('');
    setValidationError('');
    setSubmitError('');
    setShowBorrowModal(true);
  };

  const handleReturnTimeChange = (value: string) => {
    setReturnTime(value);
    if (value) {
      const error = validateReturnTime(value);
      setValidationError(error || '');
    } else {
      setValidationError('');
    }
  };

  const handleBorrowSubmit = async () => {
    if (!selectedDevice || loading) return;

    const timeError = validateReturnTime(returnTime);
    if (timeError) {
      setValidationError(timeError);
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      await axios.post('/api/devices/borrow', {
        deviceId: selectedDevice._id,
        expectedReturnTime: new Date(returnTime).toISOString()
      });
      setShowBorrowModal(false);
      setSelectedDevice(null);
      setReturnTime('');
      await fetchDevices();
    } catch (err: any) {
      if (err.response?.data?.error) {
        setSubmitError(err.response.data.error);
      } else {
        setSubmitError('借用失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (deviceId: string) => {
    try {
      await axios.post('/api/devices/return', { deviceId });
      await fetchDevices();
    } catch (err) {
      console.error('Failed to return device', err);
    }
  };

  const getMinReturnTime = (): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div>
      <h2 className="page-title">📦 设备借用</h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isCompact ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {devices.map((device) => {
          const statusInfo = STATUS_MAP[device.status];
          return (
            <div
              key={device._id}
              className="card"
              style={{
                width: '100%',
                height: '150px',
                backgroundColor: '#1e3a5f',
                borderRadius: '12px',
                padding: '16px',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '60px', background: 'rgba(255,255,255,0.05)', borderRadius: '0 12px 0 60px' }} />

              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                  {device.name}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                  {device.description}
                </div>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: statusInfo.color,
                  backgroundColor: statusInfo.bgColor
                }}>
                  {statusInfo.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {device.status === 'borrowed' && device.expectedReturnTime && (
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                    <div>归还倒计时：</div>
                    <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: '13px' }}>
                      ⏱ {countdowns[device._id] || '计算中...'}
                    </div>
                  </div>
                )}

                {device.status === 'available' && (
                  <button
                    className="btn btn-orange"
                    style={{ padding: '6px 16px', fontSize: '13px' }}
                    onClick={() => handleBorrowClick(device)}
                  >
                    借用
                  </button>
                )}

                {device.status === 'borrowed' && (
                  <button
                    className="btn btn-outline"
                    style={{
                      padding: '6px 16px',
                      fontSize: '13px',
                      color: '#ffffff',
                      borderColor: 'rgba(255,255,255,0.3)'
                    }}
                    onClick={() => handleReturn(device._id)}
                  >
                    归还
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showBorrowModal && selectedDevice && (
        <div className="modal-overlay" onClick={() => setShowBorrowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📥 确认借用</h3>
              <button className="modal-close" onClick={() => setShowBorrowModal(false)}>×</button>
            </div>

            <div style={{
              backgroundColor: '#eff6ff',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#1e3a5f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0
              }}>
                📦
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#1e3a5f' }}>{selectedDevice.name}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedDevice.description}</div>
              </div>
            </div>

            {(submitError || validationError) && (
              <div style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {submitError || validationError}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">预计归还时间 *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={returnTime}
                min={getMinReturnTime()}
                onChange={(e) => handleReturnTimeChange(e.target.value)}
                style={validationError ? { borderColor: '#ef4444' } : {}}
              />
              {validationError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  {validationError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowBorrowModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleBorrowSubmit}
                disabled={loading || !!validationError}
                style={{
                  flex: 1,
                  opacity: loading || !!validationError ? 0.6 : 1,
                  cursor: loading || !!validationError ? 'not-allowed' : 'pointer',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? '提交中...' : '确认借用'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

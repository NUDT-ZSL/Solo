import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface Device {
  id: string;
  name: string;
  owner: string;
  price: number;
  status: 'available' | 'borrowed' | 'maintenance';
}

interface BorrowRequest {
  id: string;
  deviceId: string;
  borrower: string;
  startDate: string;
  endDate: string;
  approved: boolean;
  returned: boolean;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: '空闲', color: '#66BB6A', bg: 'rgba(102,187,106,0.15)' },
  borrowed: { label: '已借用', color: '#FFA726', bg: 'rgba(255,167,38,0.15)' },
  maintenance: { label: '维修中', color: '#EF5350', bg: 'rgba(239,83,80,0.15)' },
};

const DevicePanel: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; borrower: string; message: string; deviceId: string; deviceName: string; timestamp: number }[]>([]);
  const [showBorrowForm, setShowBorrowForm] = useState(false);
  const [borrowForm, setBorrowForm] = useState({ deviceId: '', borrower: '', startDate: '', endDate: '' });
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ name: '', owner: '', price: 0, status: 'available' as Device['status'] });
  const [now, setNow] = useState(Date.now());

  const fetchDevices = useCallback(async (p: number) => {
    const res = await axios.get(`/api/devices?page=${p}&limit=10`);
    setDevices(res.data.data);
    setTotalPages(res.data.totalPages);
  }, []);

  const fetchBorrowRequests = useCallback(async () => {
    const res = await axios.get('/api/borrows');
    setBorrowRequests(res.data);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchDevices(page);
    fetchBorrowRequests();
    fetchNotifications();
  }, [page, fetchDevices, fetchBorrowRequests, fetchNotifications]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      fetchNotifications();
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post('/api/borrows', borrowForm);
    setShowBorrowForm(false);
    setBorrowForm({ deviceId: '', borrower: '', startDate: '', endDate: '' });
    fetchBorrowRequests();
  };

  const handleApprove = async (id: string) => {
    await axios.put(`/api/borrows/${id}/approve`);
    fetchBorrowRequests();
    fetchDevices(page);
  };

  const handleReturn = async (id: string) => {
    await axios.put(`/api/borrows/${id}/return`);
    fetchBorrowRequests();
    fetchDevices(page);
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post('/api/devices', deviceForm);
    setShowAddDevice(false);
    setDeviceForm({ name: '', owner: '', price: 0, status: 'available' });
    fetchDevices(page);
  };

  const pendingCount = borrowRequests.filter(r => !r.approved).length;
  const expiringBorrows = borrowRequests.filter(r => {
    if (!r.approved || r.returned) return false;
    const end = new Date(r.endDate + 'T23:59:59');
    const currentTime = new Date(now);
    const diff = end.getTime() - currentTime.getTime();
    return diff > 0 && diff < 86400000;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>设备清单</h2>
          {notifications.length > 0 && (
            <span className="return-badge" title={`${notifications.length} 件设备待归还`} style={{
              background: '#F44336', color: '#FFF', borderRadius: '50%',
              width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              animation: 'pulse 2s infinite',
            }}>{notifications.length}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowBorrowForm(true)} style={actionBtnStyle}>借用申请</button>
          <button onClick={() => setShowAddDevice(true)} style={addBtnStyle}>+ 添加设备</button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16,
          background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            background: '#F44336', color: '#FFF', borderRadius: '50%',
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>{pendingCount}</span>
          <span style={{ color: '#F44336', fontSize: 14 }}>有 {pendingCount} 条借用请求待审批</span>
        </div>
      )}

      {expiringBorrows.length > 0 && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16,
          background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            background: '#F44336', color: '#FFF', borderRadius: '50%',
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>{expiringBorrows.length}</span>
          <span style={{ color: '#F44336', fontSize: 14 }}>有 {expiringBorrows.length} 件设备24小时内到期待归还</span>
        </div>
      )}

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #333' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#2C2C2C' }}>
              {['设备名称', '归属者', '价格(¥)', '状态'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#999', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.map((d, i) => (
              <tr key={d.id} className="device-table-row" style={{
                background: i % 2 === 0 ? '#252525' : '#222',
                animationDelay: `${i * 0.03}s`,
              }}>
                <td style={{ padding: '12px 16px', fontSize: 14 }}>{d.name}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#AAA' }}>{d.owner}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#AAA' }}>{d.price.toLocaleString()}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 12,
                    color: STATUS_MAP[d.status].color,
                    background: STATUS_MAP[d.status].bg,
                  }}>
                    {STATUS_MAP[d.status].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle}>上一页</button>
        <span style={{ fontSize: 14, color: '#AAA' }}>{page} / {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtnStyle}>下一页</button>
      </div>

      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>借用记录</h3>
        {borrowRequests.length === 0 && <div style={{ color: '#666', fontSize: 14 }}>暂无借用记录</div>}
        {borrowRequests.map((r, i) => {
          const dev = devices.find(d => d.id === r.deviceId);
          return (
            <div key={r.id} className="borrow-record" style={{
              padding: 16, borderRadius: 8, marginBottom: 8,
              background: '#252525',
              animationDelay: `${i * 0.03}s`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{dev?.name || '未知设备'}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  借用人: {r.borrower} | {r.startDate} ~ {r.endDate}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!r.approved && (
                  <>
                    <span style={{ color: '#FFA726', fontSize: 12 }}>待审批</span>
                    <button onClick={() => handleApprove(r.id)} style={smallBtnStyle}>批准</button>
                  </>
                )}
                {r.approved && !r.returned && (
                  <>
                    <span style={{ color: '#66BB6A', fontSize: 12 }}>借用中</span>
                    <button onClick={() => handleReturn(r.id)} style={smallBtnStyle}>归还</button>
                  </>
                )}
                {r.returned && <span style={{ color: '#999', fontSize: 12 }}>已归还</span>}
              </div>
            </div>
          );
        })}
      </div>

      {showBorrowForm && (
        <div style={modalOverlay} onClick={() => setShowBorrowForm(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1E1E1E' }}>借用申请</h3>
            <form onSubmit={handleBorrow}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>选择设备</label>
                <select value={borrowForm.deviceId} onChange={e => setBorrowForm({ ...borrowForm, deviceId: e.target.value })} required style={inputStyle}>
                  <option value="">-- 选择设备 --</option>
                  {devices.filter(d => d.status === 'available').map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.owner})</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>借用人</label>
                <input type="text" value={borrowForm.borrower} onChange={e => setBorrowForm({ ...borrowForm, borrower: e.target.value })} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>借用开始日期</label>
                <input type="date" value={borrowForm.startDate} onChange={e => setBorrowForm({ ...borrowForm, startDate: e.target.value })} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>借用结束日期</label>
                <input type="date" value={borrowForm.endDate} onChange={e => setBorrowForm({ ...borrowForm, endDate: e.target.value })} required style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowBorrowForm(false)} style={cancelBtnStyle}>取消</button>
                <button type="submit" style={submitBtnStyle}>提交申请</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddDevice && (
        <div style={modalOverlay} onClick={() => setShowAddDevice(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1E1E1E' }}>添加设备</h3>
            <form onSubmit={handleAddDevice}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>设备名称</label>
                <input type="text" value={deviceForm.name} onChange={e => setDeviceForm({ ...deviceForm, name: e.target.value })} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>归属者</label>
                <input type="text" value={deviceForm.owner} onChange={e => setDeviceForm({ ...deviceForm, owner: e.target.value })} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>购买价格(¥)</label>
                <input type="number" value={deviceForm.price} onChange={e => setDeviceForm({ ...deviceForm, price: Number(e.target.value) })} required min={0} step={0.01} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 4 }}>状态</label>
                <select value={deviceForm.status} onChange={e => setDeviceForm({ ...deviceForm, status: e.target.value as any })} style={inputStyle}>
                  <option value="available">空闲</option>
                  <option value="borrowed">已借用</option>
                  <option value="maintenance">维修中</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddDevice(false)} style={cancelBtnStyle}>取消</button>
                <button type="submit" style={submitBtnStyle}>添加</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const actionBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: '1px solid #7C4DFF',
  background: 'transparent', color: '#7C4DFF', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};

const addBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #7C4DFF, #651FFF)', color: '#FFF',
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
};

const pageBtnStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 6, border: '1px solid #444',
  background: '#2C2C2C', color: '#FFF', fontSize: 13, cursor: 'pointer',
};

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 6, border: 'none',
  background: 'linear-gradient(135deg, #7C4DFF, #651FFF)', color: '#FFF',
  fontSize: 12, cursor: 'pointer',
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};

const modalContent: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 16, width: 400, padding: 24, color: '#1E1E1E',
  maxHeight: '80vh', overflowY: 'auto',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6,
  border: '1px solid #DDD', fontSize: 14, outline: 'none',
  background: '#F9F9F9', color: '#1E1E1E',
  transition: 'border-color 0.2s, transform 0.2s',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: '1px solid #DDD',
  background: '#FFF', color: '#1E1E1E', fontSize: 14, cursor: 'pointer',
};

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #7C4DFF, #651FFF)', color: '#FFF',
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
};

const DevicePanelWithStyles: React.FC = () => (
  <>
    <DevicePanel />
    <style>{`
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.15); opacity: 0.85; }
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .device-table-row {
        animation: fadeInUp 0.4s ease-out backwards;
      }
      .borrow-record {
        animation: fadeInUp 0.4s ease-out backwards;
      }
      .return-badge {
        box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4);
      }
    `}</style>
  </>
);

export default DevicePanelWithStyles;

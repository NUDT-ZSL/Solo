import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { formatDate } from '../utils/dateHelpers';

interface Device {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  purchasePrice: number;
  status: 'idle' | 'borrowed' | 'repairing';
  createdAt: string;
}

interface BorrowRequest {
  id: string;
  deviceId: string;
  deviceName: string;
  borrowerId: string;
  borrowerName: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  createdAt: string;
}

interface Member {
  id: string;
  name: string;
  role: string;
  city: string;
  isAdmin: boolean;
}

interface Props {
  currentUser: Member | null;
}

const PAGE_SIZE = 10;

const DevicePanel = ({ currentUser }: Props) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [pendingRequests, setPendingRequests] = useState<BorrowRequest[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const [borrowForm, setBorrowForm] = useState({
    startDate: formatDate(new Date()),
    endDate: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  });

  const [newDeviceForm, setNewDeviceForm] = useState({
    name: '',
    ownerId: currentUser?.id || 'm1',
    ownerName: currentUser?.name || '李明',
    purchasePrice: 0,
  });

  const fetchDevices = useCallback(async () => {
    try {
      let url = `/api/devices/paginated?page=${page}&pageSize=${PAGE_SIZE}`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      const res = await axios.get(url);
      let filteredDevices = res.data.devices;
      if (statusFilter !== 'all') {
        filteredDevices = filteredDevices.filter((d: Device) => d.status === statusFilter);
      }
      setDevices(filteredDevices);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('获取设备失败:', err);
    }
  }, [page, statusFilter]);

  const fetchAllDevices = async () => {
    try {
      const res = await axios.get('/api/devices');
      setAllDevices(res.data.devices || res.data);
    } catch (err) {
      console.error('获取全部设备失败:', err);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await axios.get('/api/borrow-requests/pending');
      setPendingRequests(res.data);
    } catch (err) {
      console.error('获取待审批请求失败:', err);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchAllDevices();
    fetchPendingRequests();
  }, [fetchDevices]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleBorrowRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedDevice) return;

    try {
      await axios.post('/api/borrow-requests', {
        deviceId: selectedDevice.id,
        deviceName: selectedDevice.name,
        borrowerId: currentUser.id,
        borrowerName: currentUser.name,
        startDate: borrowForm.startDate,
        endDate: borrowForm.endDate,
      });
      alert('借用请求已提交，等待管理员审批');
      setShowBorrowModal(false);
      setSelectedDevice(null);
      setBorrowForm({
        startDate: formatDate(new Date()),
        endDate: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      });
      fetchPendingRequests();
    } catch (err: any) {
      alert(err.response?.data?.error || '提交失败');
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.isAdmin) {
      alert('仅管理员可添加设备');
      return;
    }

    try {
      await axios.post('/api/devices', newDeviceForm);
      alert('设备添加成功');
      setShowAddDeviceModal(false);
      setNewDeviceForm({
        name: '',
        ownerId: currentUser?.id || 'm1',
        ownerName: currentUser?.name || '李明',
        purchasePrice: 0,
      });
      fetchDevices();
      fetchAllDevices();
    } catch (err: any) {
      alert(err.response?.data?.error || '添加失败');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await axios.put(`/api/borrow-requests/${id}/approve`);
      alert('已批准借用请求');
      fetchPendingRequests();
      fetchDevices();
      fetchAllDevices();
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await axios.put(`/api/borrow-requests/${id}/reject`);
      alert('已拒绝借用请求');
      fetchPendingRequests();
    } catch (err: any) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'idle':
        return '空闲';
      case 'borrowed':
        return '已借用';
      case 'repairing':
        return '维修中';
      default:
        return status;
    }
  };

  const getStatusPillClass = (status: string): string => {
    switch (status) {
      case 'idle':
        return 'pill idle';
      case 'borrowed':
        return 'pill borrowed';
      case 'repairing':
        return 'pill repairing';
      default:
        return 'pill';
    }
  };

  const renderBorrowModal = () => {
    if (!showBorrowModal || !selectedDevice) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowBorrowModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title" style={{ marginTop: 20 }}>申请借用设备</h2>
            <button className="modal-close" onClick={() => setShowBorrowModal(false)}>
              ✕
            </button>
          </div>
          <form onSubmit={handleBorrowRequest}>
            <div className="modal-body">
              <div className="modal-section">
                <div className="modal-info-row">
                  <span className="modal-info-icon">🎸</span>
                  <span style={{ fontWeight: 600 }}>{selectedDevice.name}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-icon">👤</span>
                  <span>归属：{selectedDevice.ownerName}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-icon">💰</span>
                  <span>购买价格：¥{selectedDevice.purchasePrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">开始日期 *</label>
                <input
                  type="date"
                  className="form-input"
                  value={borrowForm.startDate}
                  onChange={(e) => setBorrowForm({ ...borrowForm, startDate: e.target.value })}
                  min={formatDate(new Date())}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">结束日期 *</label>
                <input
                  type="date"
                  className="form-input"
                  value={borrowForm.endDate}
                  onChange={(e) => setBorrowForm({ ...borrowForm, endDate: e.target.value })}
                  min={borrowForm.startDate}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowBorrowModal(false)}
              >
                取消
              </button>
              <button type="submit" className="btn btn-primary">
                提交申请
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderAddDeviceModal = () => {
    if (!showAddDeviceModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowAddDeviceModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title" style={{ marginTop: 20 }}>添加新设备</h2>
            <button className="modal-close" onClick={() => setShowAddDeviceModal(false)}>
              ✕
            </button>
          </div>
          <form onSubmit={handleAddDevice}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">设备名称 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newDeviceForm.name}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, name: e.target.value })}
                  placeholder="例如：Fender 电吉他"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">归属成员 *</label>
                <select
                  className="form-select"
                  value={newDeviceForm.ownerId}
                  onChange={(e) => {
                    const member = allDevices.find((d) => d.ownerId === e.target.value);
                    setNewDeviceForm({
                      ...newDeviceForm,
                      ownerId: e.target.value,
                      ownerName: member?.ownerName || newDeviceForm.ownerName,
                    });
                  }}
                >
                  {['m1', 'm2', 'm3', 'm4', 'm5'].map((id) => {
                    const names: Record<string, string> = {
                      m1: '李明', m2: '王芳', m3: '张伟', m4: '刘洋', m5: '陈静',
                    };
                    return (
                      <option key={id} value={id}>
                        {names[id]}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">购买价格 (元) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={newDeviceForm.purchasePrice || ''}
                  onChange={(e) =>
                    setNewDeviceForm({
                      ...newDeviceForm,
                      purchasePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="100"
                  placeholder="例如：8500"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddDeviceModal(false)}
              >
                取消
              </button>
              <button type="submit" className="btn btn-primary">
                添加设备
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const filteredAllDevices =
    statusFilter === 'all' ? allDevices : allDevices.filter((d) => d.status === statusFilter);

  return (
    <div className="devices-panel">
      <div className="page-header">
        <h1 className="page-title">设备清单管理</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          {currentUser?.isAdmin && (
            <button className="btn btn-outline" onClick={() => setShowAddDeviceModal(true)}>
              ＋ 添加设备
            </button>
          )}
        </div>
      </div>

      <div className="devices-toolbar">
        <div className="devices-filter">
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>状态筛选：</span>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">全部</option>
            <option value="idle">空闲</option>
            <option value="borrowed">已借用</option>
            <option value="repairing">维修中</option>
          </select>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            共 {filteredAllDevices.length} 台设备
          </span>
        </div>
      </div>

      <table className="devices-table">
        <thead>
          <tr>
            <th>设备名称</th>
            <th>归属者</th>
            <th className="device-price">购买价格</th>
            <th>状态</th>
            <th style={{ textAlign: 'right' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.id}>
              <td>
                <span className="device-name">{device.name}</span>
              </td>
              <td>
                <span className="device-owner">{device.ownerName}</span>
              </td>
              <td className="device-price">
                <span className="device-price">¥{device.purchasePrice.toLocaleString()}</span>
              </td>
              <td>
                <span className={getStatusPillClass(device.status)}>
                  {getStatusText(device.status)}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <div className="device-actions" style={{ justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={device.status !== 'idle' || !currentUser}
                    onClick={() => {
                      setSelectedDevice(device);
                      setShowBorrowModal(true);
                    }}
                  >
                    {device.status === 'idle' ? '申请借用' : '不可借用'}
                  </button>
                  {currentUser?.isAdmin && (
                    <select
                      className="filter-select"
                      style={{ fontSize: 12, padding: '6px 10px' }}
                      value={device.status}
                      onChange={async (e) => {
                        try {
                          await axios.put(`/api/devices/${device.id}`, {
                            status: e.target.value,
                          });
                          fetchDevices();
                          fetchAllDevices();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      <option value="idle">设为空闲</option>
                      <option value="borrowed">设为借用</option>
                      <option value="repairing">设为维修</option>
                    </select>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {devices.length === 0 && (
            <tr>
              <td colSpan={5}>
                <div className="empty-state">
                  <div className="empty-state-icon">🎸</div>
                  <div className="empty-state-text">暂无设备数据</div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          ‹
        </button>
        <span className="pagination-info">
          第 {page} / {totalPages} 页
        </span>
        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          ›
        </button>
      </div>

      {currentUser?.isAdmin && pendingRequests.length > 0 && (
        <section className="borrow-requests-section">
          <div className="section-header">
            <h2 className="section-title">
              待审批借用请求
              <span
                className="nav-badge"
                style={{ marginLeft: 12, background: '#F44336', color: 'white', fontSize: 13 }}
              >
                {pendingRequests.length}
              </span>
            </h2>
          </div>
          <div className="requests-list">
            {pendingRequests.map((req) => (
              <div key={req.id} className="request-card">
                <div className="request-info">
                  <div className="request-device">{req.deviceName}</div>
                  <div className="request-details">
                    借用人：{req.borrowerName} · 时间：{req.startDate} ~ {req.endDate}
                  </div>
                </div>
                <div className="request-actions">
                  <span className="pill pending">待审批</span>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleApprove(req.id)}
                  >
                    批准
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleReject(req.id)}
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {renderBorrowModal()}
      {renderAddDeviceModal()}
    </div>
  );
};

export default DevicePanel;

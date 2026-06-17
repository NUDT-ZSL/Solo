import { useState, useEffect, useCallback } from 'react';
import { getDevices, getStats } from '../api/borrowApi';
import type { Device, Stats } from '../types';
import DeviceCard from '../components/DeviceCard';

export default function Overview() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'borrowed' | 'maintenance'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [devicesRes, statsRes] = await Promise.all([
        getDevices(1, 20),
        getStats()
      ]);
      setDevices(devicesRes.data);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDevices = devices.filter(d => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const filters: { key: typeof filter; label: string; count?: number }[] = [
    { key: 'all', label: '全部', count: stats?.totalDevices },
    { key: 'available', label: '空闲', count: stats?.availableDevices },
    { key: 'borrowed', label: '被借', count: stats?.borrowedDevices },
    { key: 'maintenance', label: '维修', count: stats?.maintenanceDevices }
  ];

  return (
    <div className="page-transition">
      <div className="page-header">
        <h1 className="page-title">设备总览</h1>
        <p className="page-subtitle">查看并借用共享办公空间的设备资源</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">设备总数</div>
            <div className="stat-value">{stats.totalDevices}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">空闲设备</div>
            <div className="stat-value success">{stats.availableDevices}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">借用中</div>
            <div className="stat-value warning">{stats.borrowedDevices}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">维修中</div>
            <div className="stat-value danger">{stats.maintenanceDevices}</div>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
          设备列表
          <span style={{
            fontSize: '14px',
            fontWeight: '400',
            color: 'var(--text-secondary)',
            marginLeft: '10px'
          }}>
            共 {filteredDevices.length} 台
          </span>
        </h2>

        <div className="filter-tabs">
          {filters.map(f => (
            <button
              key={f.key}
              className={`filter-tab ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span style={{
                marginLeft: '6px',
                opacity: 0.7,
                fontWeight: '600'
              }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="alert alert-error" style={{ display: 'inline-block' }}>
            {error}
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: '16px', display: 'block', margin: '16px auto 0' }}
            onClick={loadData}
          >
            重新加载
          </button>
        </div>
      )}

      {!loading && !error && filteredDevices.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">该分类下暂无设备</div>
        </div>
      )}

      {!loading && !error && filteredDevices.length > 0 && (
        <div className="devices-grid">
          {filteredDevices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              onBorrowSuccess={loadData}
            />
          ))}
        </div>
      )}
    </div>
  );
}

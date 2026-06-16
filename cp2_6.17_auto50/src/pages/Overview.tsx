import { useState, useEffect } from 'react';
import { getDevices } from '../api/borrowApi';
import { DeviceCard } from '../components/DeviceCard';
import type { Device } from '../types';
import './Overview.css';

export function Overview() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const data = await getDevices();
        setDevices(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取设备列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  const totalPages = Math.ceil(devices.length / itemsPerPage);
  const paginatedDevices = devices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="overview-page">
        <div className="loading-state">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overview-page">
        <div className="error-state">{error}</div>
      </div>
    );
  }

  return (
    <div className="overview-page">
      <div className="page-header">
        <h1>设备总览</h1>
        <p className="page-subtitle">共 {devices.length} 台设备可供借用</p>
      </div>
      
      <div className="device-grid">
        {paginatedDevices.map(device => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            上一页
          </button>
          <span className="page-info">
            第 {currentPage} / {totalPages} 页
          </span>
          <button
            className="page-btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

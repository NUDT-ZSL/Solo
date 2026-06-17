import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Device } from '../types';
import { getDevices } from '../api/borrowApi';
import { DeviceCard } from '../components/DeviceCard';

/* Overview.tsx - 设备总览页
   调用关系：路由 /overview，由 App.tsx 渲染
   数据流：useEffect → borrowApi.getDevices → 渲染 DeviceCard 网格
   布局：响应式网格 ≥1024px 4列 / 768-1023px 3列 / <768px 2列，间距24px
*/

const CURRENT_USER_ID = 'u-001';
const CURRENT_USER_CREDIT = 100;

export function Overview() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDevices()
      .then((data) => {
        if (active) setDevices(data);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : '加载失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totalPages = Math.ceil(devices.length / pageSize);
  const paged = devices.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <div style={centerStyle}>加载设备中…</div>;
  if (error) return <div style={centerStyle}>错误：{error}</div>;

  return (
    <div style={wrapStyle}>
      <h2 style={h2Style}>设备总览</h2>
      <div style={gridStyle} className="device-grid">
        {paged.map((device) => (
          <Link
            key={device.id}
            to={`/device/${device.id}`}
            style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}
          >
            <DeviceCard
              device={device}
              userId={CURRENT_USER_ID}
              userCredit={CURRENT_USER_CREDIT}
            />
          </Link>
        ))}
      </div>
      {totalPages > 1 && (
        <div style={pagerStyle}>
          <button
            style={pageBtn(page === 1)}
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </button>
          <span style={pageInfoStyle}>第 {page} / {totalPages} 页</span>
          <button
            style={pageBtn(page === totalPages)}
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '24px',
};

const h2Style: React.CSSProperties = {
  margin: '0 0 24px',
  fontSize: '22px',
  color: '#1e293b',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '24px',
};

const centerStyle: React.CSSProperties = {
  padding: '60px',
  textAlign: 'center',
  color: '#64748b',
  fontSize: '16px',
};

const pagerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  marginTop: '32px',
};

function pageBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 16px',
    borderRadius: '8px',
    border: 'none',
    background: disabled ? '#94a3b8' : '#1e293b',
    color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '13px',
  };
}

const pageInfoStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#475569',
};

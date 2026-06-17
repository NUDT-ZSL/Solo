import { useEffect } from 'react';
import DeviceCard from '@/components/DeviceCard';
import { useBorrow } from '@/hooks/useBorrow';
import { CURRENT_USER_ID } from '@/utils/constants';
import { Loader2 } from 'lucide-react';

const Overview = () => {
  const { devices, user, fetchDevices, fetchUser } = useBorrow();

  useEffect(() => {
    fetchDevices();
    fetchUser(CURRENT_USER_ID);
  }, [fetchDevices, fetchUser]);

  return (
    <div
      style={{
        padding: '24px',
        minHeight: 'calc(100vh - 60px)',
        backgroundColor: '#f8fafc',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '8px',
          }}
        >
          设备总览
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          浏览所有可借用的办公设备，点击卡片查看详情
        </p>
      </div>

      {devices.loading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '60px',
          }}
        >
          <Loader2 size={32} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {devices.error && (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            color: '#ef4444',
            backgroundColor: '#fef2f2',
            borderRadius: '12px',
          }}
        >
          {devices.error}
        </div>
      )}

      {devices.data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px',
            justifyItems: 'center',
          }}
        >
          {devices.data.map((device) => (
            <DeviceCard key={device.id} device={device} currentUser={user.data} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1023px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 20px !important;
          }
        }
        @media (max-width: 767px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
          div[style*="width: '240px'"] {
            width: 100% !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Overview;

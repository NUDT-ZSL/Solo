import { useDevices } from '../hooks/useDevices';
import { useUser } from '../hooks/useUser';
import { DeviceCard } from '../components/DeviceCard';

export function Overview() {
  const { data: devices, loading: devicesLoading, error: devicesError } = useDevices();
  const { data: user, loading: userLoading, error: userError } = useUser('user-1');

  if (devicesLoading || userLoading) {
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

  if (devicesError || userError) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '16px',
        color: '#ef4444',
      }}>
        错误: {devicesError || userError}
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '32px 24px',
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          margin: 0,
          marginBottom: '8px',
          fontSize: '28px',
          fontWeight: 700,
          color: '#1f2937',
        }}>
          设备总览
        </h1>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#6b7280',
        }}>
          浏览并借用可用的设备
        </p>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px',
      }}>
        {devices?.map((device) => (
          <DeviceCard key={device.id} device={device} user={user} />
        ))}
      </div>
    </div>
  );
}
